import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from "./dto";
import { PrismaClient } from "@prisma/client";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { NATS_SERVICE } from "../config";
import { catchError, firstValueFrom } from "rxjs";

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) {
    super();
  }

  private readonly logger = new Logger("OrdersService");

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Connected to database");
  }

  async create(createOrderDto: CreateOrderDto) {
    // confirmar ids de productos
    const ids = createOrderDto.items.map(item => item.productId);
    const products = await firstValueFrom(this.client.send({ cmd: "validate_products" }, ids).pipe(catchError(error => {
      throw new RpcException(error);
    })));

    //   cálculos de valores
    const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
      const price = products.find(product => product.id === orderItem.productId).price;
      return acc + (price * orderItem.quantity);
    }, 0);

    const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
      return acc + orderItem.quantity;
    }, 0);

    //   crear transacción de base de datos
    const order = await this.order.create({
      data: {
        totalAmount,
        totalItems,
        // relación
        OrderItem: {
          createMany: {
            data: createOrderDto.items.map((orderItem) => ({
              price: products.find(product => product.id === orderItem.productId).price,
              productId: orderItem.productId,
              quantity: orderItem.quantity
            }))
          }
        }
      },
      // Para que en la respuesta se incluyan los items (detalle de la orden)
      include: {
        OrderItem: {
          select: {
            price: true,
            productId: true,
            quantity: true
          }
        }
      }
    });

    return {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        name: products.find(product => product.id === orderItem.productId).name
      }))
    };

  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalOrders = await this.order.count({
      where: {
        status: orderPaginationDto.status
      }
    });

    if (totalOrders === 0) {
      return {
        data: "No orders found",
        metadata: {
          total: totalOrders,
          page: 1,
          lastPage: 1
        }
      };
    }

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;
    const totalPages = Math.ceil(totalOrders / perPage);

    if (currentPage > totalPages) {
      return {
        data: await this.order.findMany({
          skip: (totalPages - 1) * perPage,
          take: perPage,
          where: {
            status: orderPaginationDto.status
          }
        }),
        meta: {
          total: totalOrders,
          page: totalPages,
          lastPage: totalPages
        }
      };
    }

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status
        }
      }),
      meta: {
        total: totalOrders,
        page: currentPage,
        lastPage: totalPages
      }
    };
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            productId: true,
            quantity: true
          }
        }
      }
    });
    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      });
    }

    const ids = order.OrderItem.map(item => item.productId);
    const products = await firstValueFrom(this.client.send({ cmd: "validate_products" }, ids).pipe(catchError(error => {
      throw new RpcException(error);
    })));

    return {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        name: products.find(product => product.id === orderItem.productId).name
      }))
    };
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if (status === order.status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status }
    });
  }
}

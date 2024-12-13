import { PaginationDto } from "../../common";
import { IsEnum, IsOptional } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";
import { OrderStatus } from "@prisma/client";

export class OrderPaginationDto extends PaginationDto{
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `Order Status must be one of the following: ${OrderStatusList}`,
  })
  status: OrderStatus
}
import { OrderStatus } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";

export class ChangeOrderStatusDto{
  @IsUUID(4)
  id: string;

  @IsEnum(OrderStatusList, {
    message: `Order Status must be one of the following: ${OrderStatusList}`,
  })
  status: OrderStatus;
}
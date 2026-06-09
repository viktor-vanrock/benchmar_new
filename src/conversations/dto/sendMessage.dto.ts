import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID('4')
  conversationId!: string;

  @IsIn(['option', 'text'])
  kind!: 'option' | 'text';

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  label?: string;
}

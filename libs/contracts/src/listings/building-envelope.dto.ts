import { ApiProperty } from '@nestjs/swagger';
import { BuildingResponseDto } from './building-response.dto';

export class BuildingEnvelopeDto {
  @ApiProperty({ description: 'Building data', type: BuildingResponseDto })
  data: BuildingResponseDto;
}


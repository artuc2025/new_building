"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingEnvelopeDto = void 0;
const tslib_1 = require("tslib");
const swagger_1 = require("@nestjs/swagger");
const building_response_dto_1 = require("./building-response.dto");
class BuildingEnvelopeDto {
    data;
}
exports.BuildingEnvelopeDto = BuildingEnvelopeDto;
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Building data', type: building_response_dto_1.BuildingResponseDto }),
    tslib_1.__metadata("design:type", building_response_dto_1.BuildingResponseDto)
], BuildingEnvelopeDto.prototype, "data", void 0);
//# sourceMappingURL=building-envelope.dto.js.map
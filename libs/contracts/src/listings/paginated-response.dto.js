"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedBuildingsResponseDto = exports.ResponseMetaDto = exports.PaginationMetaDto = void 0;
const tslib_1 = require("tslib");
const swagger_1 = require("@nestjs/swagger");
const building_response_dto_1 = require("./building-response.dto");
class PaginationMetaDto {
    page;
    limit;
    total;
    totalPages;
    hasNext;
    hasPrev;
}
exports.PaginationMetaDto = PaginationMetaDto;
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current page number (1-based)' }),
    tslib_1.__metadata("design:type", Number)
], PaginationMetaDto.prototype, "page", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Items per page' }),
    tslib_1.__metadata("design:type", Number)
], PaginationMetaDto.prototype, "limit", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of items' }),
    tslib_1.__metadata("design:type", Number)
], PaginationMetaDto.prototype, "total", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of pages' }),
    tslib_1.__metadata("design:type", Number)
], PaginationMetaDto.prototype, "totalPages", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether there is a next page' }),
    tslib_1.__metadata("design:type", Boolean)
], PaginationMetaDto.prototype, "hasNext", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether there is a previous page' }),
    tslib_1.__metadata("design:type", Boolean)
], PaginationMetaDto.prototype, "hasPrev", void 0);
class ResponseMetaDto {
    currency;
    exchangeRate;
    sort;
}
exports.ResponseMetaDto = ResponseMetaDto;
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Currency used for prices', enum: ['AMD', 'USD'], example: 'AMD' }),
    tslib_1.__metadata("design:type", String)
], ResponseMetaDto.prototype, "currency", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Exchange rate used for currency conversion', example: 1.0 }),
    tslib_1.__metadata("design:type", Number)
], ResponseMetaDto.prototype, "exchangeRate", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sort option used', example: 'date_desc' }),
    tslib_1.__metadata("design:type", String)
], ResponseMetaDto.prototype, "sort", void 0);
class PaginatedBuildingsResponseDto {
    data;
    pagination;
    meta;
}
exports.PaginatedBuildingsResponseDto = PaginatedBuildingsResponseDto;
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'List of buildings', type: [building_response_dto_1.BuildingResponseDto] }),
    tslib_1.__metadata("design:type", Array)
], PaginatedBuildingsResponseDto.prototype, "data", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pagination metadata', type: PaginationMetaDto }),
    tslib_1.__metadata("design:type", PaginationMetaDto)
], PaginatedBuildingsResponseDto.prototype, "pagination", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response metadata', type: ResponseMetaDto }),
    tslib_1.__metadata("design:type", ResponseMetaDto)
], PaginatedBuildingsResponseDto.prototype, "meta", void 0);
//# sourceMappingURL=paginated-response.dto.js.map
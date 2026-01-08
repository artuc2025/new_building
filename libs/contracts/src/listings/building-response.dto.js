"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingResponseDto = void 0;
const tslib_1 = require("tslib");
const swagger_1 = require("@nestjs/swagger");
class BuildingResponseDto {
    id;
    title;
    description;
    address;
    location;
    addressLine1;
    addressLine2;
    city;
    postalCode;
    floors;
    totalUnits;
    commissioningDate;
    constructionStatus;
    pricePerM2Min;
    pricePerM2Max;
    areaMin;
    areaMax;
    currency;
    developerId;
    regionId;
    status;
    isFeatured;
    developerWebsiteUrl;
    developerFacebookUrl;
    developerInstagramUrl;
    createdAt;
    updatedAt;
    publishedAt;
    createdBy;
}
exports.BuildingResponseDto = BuildingResponseDto;
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Building ID (UUID)' }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "id", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Building title in multiple languages' }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Building description in multiple languages', required: false }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Building address in multiple languages' }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "address", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Geographic location', example: { lat: 40.1811, lng: 44.5144 } }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "location", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Address line 1', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "addressLine1", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Address line 2', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "addressLine2", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City' }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "city", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Postal code', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "postalCode", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of floors' }),
    tslib_1.__metadata("design:type", Number)
], BuildingResponseDto.prototype, "floors", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total units', required: false }),
    tslib_1.__metadata("design:type", Number)
], BuildingResponseDto.prototype, "totalUnits", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Commissioning date', required: false }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "commissioningDate", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Construction status',
        enum: ['planned', 'under_construction', 'completed'],
        required: false,
    }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "constructionStatus", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Minimum price per m²', required: false }),
    tslib_1.__metadata("design:type", Number)
], BuildingResponseDto.prototype, "pricePerM2Min", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Maximum price per m²', required: false }),
    tslib_1.__metadata("design:type", Number)
], BuildingResponseDto.prototype, "pricePerM2Max", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Minimum area (m²)' }),
    tslib_1.__metadata("design:type", Number)
], BuildingResponseDto.prototype, "areaMin", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Maximum area (m²)' }),
    tslib_1.__metadata("design:type", Number)
], BuildingResponseDto.prototype, "areaMax", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Currency code' }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "currency", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Developer ID (UUID)' }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "developerId", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Region ID (UUID)' }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "regionId", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status',
        enum: ['draft', 'published', 'archived'],
    }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "status", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is featured', required: false }),
    tslib_1.__metadata("design:type", Boolean)
], BuildingResponseDto.prototype, "isFeatured", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Developer website URL', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "developerWebsiteUrl", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Developer Facebook URL', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "developerFacebookUrl", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Developer Instagram URL', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "developerInstagramUrl", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created at timestamp' }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Updated at timestamp' }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "updatedAt", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Published at timestamp', required: false }),
    tslib_1.__metadata("design:type", Object)
], BuildingResponseDto.prototype, "publishedAt", void 0);
tslib_1.__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created by user ID (UUID)', required: false }),
    tslib_1.__metadata("design:type", String)
], BuildingResponseDto.prototype, "createdBy", void 0);
//# sourceMappingURL=building-response.dto.js.map
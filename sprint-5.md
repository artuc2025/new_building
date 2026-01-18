# Sprint 5: Frontend - Building Listings & Filters

## Goal
Implement the core building functionality in the Nuxt 3 frontend: listings, filtering, sorting, and pagination.

## Tasks
- [x] **Generate API Client** (TypeScript from OpenAPI) → Verify: `frontend/src/api` contains generated client files
- [x] **Create Pinia Store** `useBuildingsStore` (State management) → Verify: Store handles list, filters, and pagination state
- [x] **Create Composables** (`useBuildings`, `useFilters`, `usePagination`) → Verify: Business logic is isolated and unit testable
- [x] **Create UI Components** (`BuildingCard`, `BuildingList`) → Verify: Components render with mock data
- [x] **Create Filter Components** (`FilterPanel`, `SortDropdown`) → Verify: UI inputs (sliders, dropdowns) work
- [x] **Implement Page** `/buildings` (List View) → Verify: Page loads and fetching data from API works
- [x] **Connect Filters & Sort** to API → Verify: Changing filter updates the list via API params
- [x] **Implement Pagination** UI & Logic → Verify: "Load More" or pages work correctly
- [x] **Add Loading & Error States** (Skeletons) → Verify: Smooth transition during data fetch
- [x] **Responsive Design Check** → Verify: Layout works on mobile and desktop
- [x] **Fix Pagination & Navigation** → Verify: useBuildings exports necessary helpers and [id].vue exists

## Done When
- [x] `/buildings` page displays paginated real estate listings
- [x] Filters (price, area, location, developer, commissioning date) work correctly
- [x] Sorting (price, date, area) updates the list
- [x] Clicking a card navigates to `/buildings/[id]` (stub page for now)
- [x] Unit tests for composables are passing


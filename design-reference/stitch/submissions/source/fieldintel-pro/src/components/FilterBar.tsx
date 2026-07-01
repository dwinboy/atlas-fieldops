import { Search, Calendar, ChevronDown, Filter } from 'lucide-react';
import { SectorType, StatusType } from '../types';

interface FilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  selectedSector: SectorType | 'ALL';
  onSectorChange: (sector: SectorType | 'ALL') => void;
  selectedStatus: StatusType | 'ALL';
  onStatusChange: (status: StatusType | 'ALL') => void;
  selectedDateRange: string;
  onDateRangeClick: () => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

export default function FilterBar({
  searchText,
  onSearchChange,
  selectedSector,
  onSectorChange,
  selectedStatus,
  onStatusChange,
  selectedDateRange,
  onDateRangeClick,
  onApplyFilters,
  onResetFilters,
}: FilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-outline-variant flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm">
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4.5 h-4.5" />
        <input
          id="filter-search-input"
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface font-medium placeholder:text-on-surface-variant/70"
          placeholder="Search by ID, Entity or Staff..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchText && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant hover:text-primary cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      <div className="hidden md:block h-10 w-px bg-outline-variant"></div>

      {/* Selectors and Dates */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sector Dropdown */}
        <div className="relative">
          <select
            id="filter-sector-select"
            className="appearance-none bg-surface-container-lowest border border-outline-variant rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value as SectorType | 'ALL')}
          >
            <option value="ALL">All Sectors</option>
            <option value="AGRI">Agriculture</option>
            <option value="HEALTH">Health</option>
            <option value="INFRA">Infrastructure</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            id="filter-status-select"
            className="appearance-none bg-surface-container-lowest border border-outline-variant rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as StatusType | 'ALL')}
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Review">In Review</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-3.5 h-3.5 pointer-events-none" />
        </div>

        {/* Date Calendar Picker */}
        <button
          id="btn-filter-calendar"
          onClick={onDateRangeClick}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors text-xs font-bold text-on-surface"
        >
          <Calendar className="w-4 h-4 text-on-surface-variant" />
          <span>{selectedDateRange}</span>
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          id="btn-apply-filters"
          onClick={onApplyFilters}
          className="flex-1 bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-container hover:text-on-primary-container cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          Apply Filters
        </button>
        {(selectedSector !== 'ALL' || selectedStatus !== 'ALL' || searchText !== '') && (
          <button
            onClick={onResetFilters}
            className="px-3 py-2 border border-outline text-on-surface-variant hover:text-primary rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

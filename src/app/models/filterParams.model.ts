import { Statistics } from './agency.model';
export interface FilterParams {
    neighborhood?: string;
    role?: string;
    term?: string;
    status?: string;
    search?: string;
    getAll?:boolean;
};
import { Periode } from './periode.model';


export interface Page<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}


export interface PageParams<F = unknown> {
  page?: number;
  pageSize?: number;
  filter?: F;
  periode?: Periode;
}

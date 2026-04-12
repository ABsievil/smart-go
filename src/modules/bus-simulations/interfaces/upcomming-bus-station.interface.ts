import { IStationEta } from './station-eta.interface';

export interface IUpcomingBusAtStation {
    tripId: string;
    routeId: string;
    routeCode: string;
    routeName: string;
    eta: IStationEta;
}

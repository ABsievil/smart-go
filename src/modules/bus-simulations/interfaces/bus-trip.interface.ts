import { BusTripStatus } from '@modules/bus-simulations/enums/bus-simulation.enum';

export interface IBusTripInstance {
    tripId: string;
    routeId: string;
    routeCode: string;
    routeName: string;
    departureTime: Date;
    expectedArrivalTime: Date;
    status: BusTripStatus;
    stationIds: string[];
    tripDurationMinutes: number;
}

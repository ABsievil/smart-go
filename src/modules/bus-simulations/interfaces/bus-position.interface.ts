import { BusTripStatus } from '@modules/bus-simulations/enums/bus-simulation.enum';
import { IStationEta } from '@modules/bus-simulations/interfaces/station-eta.interface';

export interface IBusPosition {
    tripId: string;
    routeId: string;
    routeCode: string;
    routeName: string;
    timestamp: Date;
    latitude: number;
    longitude: number;
    currentStationIndex: number;
    currentStationId: string;
    nextStationId: string | null;
    progressToNextStation: number;
    status: BusTripStatus;
    departureTime: Date;
    expectedArrivalTime: Date;
    elapsedMinutes: number;
    remainingMinutes: number;
    stationEtas: IStationEta[];
}

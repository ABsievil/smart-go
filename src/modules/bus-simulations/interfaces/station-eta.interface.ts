export interface IStationEta {
    stationId: string;
    stationIndex: number;
    stationName?: string;
    latitude: number;
    longitude: number;
    eta: Date;
    minutesAway: number;
    isReached: boolean;
}

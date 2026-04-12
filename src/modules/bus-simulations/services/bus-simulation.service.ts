import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, interval } from 'rxjs';
import { map, share, startWith } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { RouteEntity } from '@modules/routes/repositories/entities/route.entity';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';
import { BusTripStatus } from '@modules/bus-simulations/enums/bus-simulation.enum';
import { IBusTripInstance } from '@modules/bus-simulations/interfaces/bus-trip.interface';
import { IBusPosition } from '@modules/bus-simulations/interfaces/bus-position.interface';
import { IStationEta } from '@modules/bus-simulations/interfaces/station-eta.interface';
import { BusTripResponseDto } from '@modules/bus-simulations/dtos/response/bus-trip.response.dto';
import { BusPositionResponseDto } from '@modules/bus-simulations/dtos/response/bus-position.response.dto';

export interface IUpcomingBusAtStation {
    tripId: string;
    routeId: string;
    routeCode: string;
    routeName: string;
    eta: IStationEta;
}

@Injectable()
export class BusSimulationService {
    private readonly logger = new Logger(BusSimulationService.name);

    private readonly routeMap = new Map<string, RouteEntity>();
    private readonly stationMap = new Map<string, StationEntity>();
    private readonly tripsByRoute = new Map<string, IBusTripInstance[]>();
    private readonly tripIndex = new Map<string, IBusTripInstance>();

    private readonly ticker$ = interval(5_000).pipe(startWith(0), share());

    initializeRoutes(routes: RouteEntity[], stations: StationEntity[]): void {
        this.stationMap.clear();
        this.routeMap.clear();
        this.tripsByRoute.clear();
        this.tripIndex.clear();

        for (const station of stations) {
            this.stationMap.set(station._id, station);
        }

        let totalTrips = 0;
        for (const route of routes) {
            if (!route.operatingTimeStart || !route.operatingTimeEnd || !route.tripTime) {
                continue;
            }
            this.routeMap.set(route._id, route);
            const trips = this.buildTripSchedule(route);
            this.tripsByRoute.set(route._id, trips);
            for (const trip of trips) {
                this.tripIndex.set(trip.tripId, trip);
            }
            totalTrips += trips.length;
        }

        this.logger.log(
            `Initialized ${this.routeMap.size} routes with ${totalTrips} trips for today`,
        );
    }

    // ─── Schedule builders ───────────────────────────────────────────────────

    private buildTripSchedule(route: RouteEntity): IBusTripInstance[] {
        const today = new Date();
        const tripDurationMinutes = this.parseDurationMinutes(route.tripTime);
        const frequencyMinutes = this.parseFrequencyMinutes(route.frequency ?? '15 phút');
        const startTime = this.parseTimeToDate(route.operatingTimeStart, today);
        const endTime = this.parseTimeToDate(route.operatingTimeEnd, today);

        const trips: IBusTripInstance[] = [];
        let departure = new Date(startTime);

        while (departure <= endTime) {
            const arrival = new Date(departure.getTime() + tripDurationMinutes * 60_000);
            trips.push({
                tripId: randomUUID(),
                routeId: route._id,
                routeCode: route.routeCode,
                routeName: route.routeName,
                departureTime: new Date(departure),
                expectedArrivalTime: arrival,
                status: BusTripStatus.SCHEDULED,
                stationIds: route.stationIds ?? [],
                tripDurationMinutes,
            });
            departure = new Date(departure.getTime() + frequencyMinutes * 60_000);
        }

        return trips;
    }

    // ─── Position computation ────────────────────────────────────────────────

    private computePosition(trip: IBusTripInstance): IBusPosition {
        const now = new Date();
        const elapsedMs = now.getTime() - trip.departureTime.getTime();
        const elapsedMinutes = elapsedMs / 60_000;
        const remainingMinutes = trip.tripDurationMinutes - elapsedMinutes;

        const status = this.resolveTripStatus(elapsedMinutes, trip.tripDurationMinutes);

        const stationIds = trip.stationIds;
        const numStations = stationIds.length;
        const segmentCount = Math.max(numStations - 1, 1);
        const timePerSegmentMinutes = trip.tripDurationMinutes / segmentCount;

        const progressRatio = Math.max(0, Math.min(1, elapsedMinutes / trip.tripDurationMinutes));
        const rawSegment = progressRatio * segmentCount;
        const currentSegment = Math.min(Math.floor(rawSegment), segmentCount - 1);
        const segmentProgress = rawSegment - currentSegment;

        const currentStationId = stationIds[currentSegment] ?? stationIds[0];
        const nextStationId = stationIds[currentSegment + 1] ?? null;

        const { latitude, longitude } = this.interpolatePosition(
            currentStationId,
            nextStationId,
            segmentProgress,
        );

        const stationEtas = this.buildStationEtas(trip, timePerSegmentMinutes, now);

        return {
            tripId: trip.tripId,
            routeId: trip.routeId,
            routeCode: trip.routeCode,
            routeName: trip.routeName,
            timestamp: now,
            latitude,
            longitude,
            currentStationIndex: currentSegment,
            currentStationId,
            nextStationId,
            progressToNextStation: Math.round(segmentProgress * 100) / 100,
            status,
            departureTime: trip.departureTime,
            expectedArrivalTime: trip.expectedArrivalTime,
            elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
            remainingMinutes: Math.round(remainingMinutes * 10) / 10,
            stationEtas,
        };
    }

    private resolveTripStatus(
        elapsedMinutes: number,
        tripDurationMinutes: number,
    ): BusTripStatus {
        if (elapsedMinutes < 0) return BusTripStatus.SCHEDULED;
        if (elapsedMinutes >= tripDurationMinutes) return BusTripStatus.COMPLETED;
        return BusTripStatus.RUNNING;
    }

    private interpolatePosition(
        fromStationId: string,
        toStationId: string | null,
        progress: number,
    ): { latitude: number; longitude: number } {
        const from = this.stationMap.get(fromStationId);
        const to = toStationId ? this.stationMap.get(toStationId) : undefined;

        if (!from) return { latitude: 0, longitude: 0 };
        if (!to) return { latitude: from.latitude, longitude: from.longitude };

        return {
            latitude: from.latitude + (to.latitude - from.latitude) * progress,
            longitude: from.longitude + (to.longitude - from.longitude) * progress,
        };
    }

    private buildStationEtas(
        trip: IBusTripInstance,
        timePerSegmentMinutes: number,
        now: Date,
    ): IStationEta[] {
        return trip.stationIds.map((stationId, idx) => {
            const station = this.stationMap.get(stationId);
            const etaMs =
                trip.departureTime.getTime() + idx * timePerSegmentMinutes * 60_000;
            const eta = new Date(etaMs);
            const minutesAway = (etaMs - now.getTime()) / 60_000;

            return {
                stationId,
                stationIndex: idx,
                stationName: station?.stationName,
                latitude: station?.latitude ?? 0,
                longitude: station?.longitude ?? 0,
                eta,
                minutesAway: Math.max(0, Math.round(minutesAway * 10) / 10),
                isReached: minutesAway < 0,
            };
        });
    }

    // ─── Active window helpers ────────────────────────────────────────────────

    private isWithinActiveWindow(trip: IBusTripInstance, now: Date): boolean {
        const elapsed = (now.getTime() - trip.departureTime.getTime()) / 60_000;
        return elapsed >= -10 && elapsed <= trip.tripDurationMinutes + 5;
    }

    // ─── Public query methods ─────────────────────────────────────────────────

    getActiveBusPositions(routeId: string): IBusPosition[] {
        const now = new Date();
        return (this.tripsByRoute.get(routeId) ?? [])
            .filter((trip) => this.isWithinActiveWindow(trip, now))
            .map((trip) => this.computePosition(trip));
    }

    getTripSchedule(routeId: string): IBusTripInstance[] {
        return this.tripsByRoute.get(routeId) ?? [];
    }

    getTripPosition(tripId: string): IBusPosition | null {
        const trip = this.tripIndex.get(tripId);
        return trip ? this.computePosition(trip) : null;
    }

    getUpcomingBusesAtStation(stationId: string): IUpcomingBusAtStation[] {
        const now = new Date();
        const results: IUpcomingBusAtStation[] = [];

        for (const [routeId, trips] of this.tripsByRoute) {
            const route = this.routeMap.get(routeId);
            if (!route?.stationIds) continue;

            const stationIndex = route.stationIds.indexOf(stationId);
            if (stationIndex === -1) continue;

            const segmentCount = Math.max(route.stationIds.length - 1, 1);
            const tripDuration = this.parseDurationMinutes(route.tripTime);
            const timePerSegment = tripDuration / segmentCount;
            const station = this.stationMap.get(stationId);

            for (const trip of trips) {
                const etaMs =
                    trip.departureTime.getTime() + stationIndex * timePerSegment * 60_000;
                const eta = new Date(etaMs);
                const minutesAway = (etaMs - now.getTime()) / 60_000;

                if (minutesAway < 0 || minutesAway > 90) continue;

                results.push({
                    tripId: trip.tripId,
                    routeId,
                    routeCode: trip.routeCode,
                    routeName: trip.routeName,
                    eta: {
                        stationId,
                        stationIndex,
                        stationName: station?.stationName,
                        latitude: station?.latitude ?? 0,
                        longitude: station?.longitude ?? 0,
                        eta,
                        minutesAway: Math.round(minutesAway * 10) / 10,
                        isReached: false,
                    },
                });
            }
        }

        return results.sort((a, b) => a.eta.minutesAway - b.eta.minutesAway);
    }

    // ─── SSE Observables ──────────────────────────────────────────────────────

    streamRoutePositions(routeId: string): Observable<MessageEvent> {
        return this.ticker$.pipe(
            map(() => ({
                data: this.getActiveBusPositions(routeId),
            } as MessageEvent)),
        );
    }

    streamTripPosition(tripId: string): Observable<MessageEvent> {
        return this.ticker$.pipe(
            map(() => ({
                data: this.getTripPosition(tripId),
            } as MessageEvent)),
        );
    }

    streamStationEtas(stationId: string): Observable<MessageEvent> {
        return this.ticker$.pipe(
            map(() => ({
                data: this.getUpcomingBusesAtStation(stationId),
            } as MessageEvent)),
        );
    }

    // ─── Mappers ─────────────────────────────────────────────────────────────

    mapTripToDto(trip: IBusTripInstance): BusTripResponseDto {
        const now = new Date();
        const elapsed = (now.getTime() - trip.departureTime.getTime()) / 60_000;
        return {
            ...trip,
            status: this.resolveTripStatus(elapsed, trip.tripDurationMinutes),
        };
    }

    mapPositionToDto(position: IBusPosition): BusPositionResponseDto {
        return { ...position };
    }

    // ─── Time parsers ─────────────────────────────────────────────────────────

    private parseDurationMinutes(raw: string): number {
        const match = raw.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 30;
    }

    private parseFrequencyMinutes(raw: string): number {
        const matches = raw.match(/\d+/g);
        if (!matches || matches.length === 0) return 15;
        const values = matches.map(Number);
        return values.reduce((sum, v) => sum + v, 0) / values.length;
    }

    private parseTimeToDate(timeStr: string, baseDate: Date): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
}

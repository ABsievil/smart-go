import { ParetoOptimalPathDto } from '@modules/routing/dtos/response/routing.response.dto';
import { RoutingMetricsDto } from '@modules/routing/dtos/response/routing-metrics.dto';

/**
 * Interface cho raw routing response data (trước khi transform thành DTO)
 */
export interface RoutingResponseData {
    paths: ParetoOptimalPathDto[];
    metrics: RoutingMetricsDto;
    congestionApplied: boolean;
    timeOfDay: number;
}

import { IsObject, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { DetectionRequestTrace } from '@/modules/detection-module/dtos/requests/detect-request'

export class DetectionRequest {
    @IsObject()
    @ValidateNested()
    @Type(() => DetectionRequestTrace)
    trace!: DetectionRequestTrace
}

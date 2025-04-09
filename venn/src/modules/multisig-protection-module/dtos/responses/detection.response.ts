import { Expose } from 'class-transformer'
import { plainToInstance } from 'class-transformer'
import { Finding } from 'forta-agent'

export class DetectionResponse {
    findings: Finding[] = []
}

export class DetectionResponseDTO {
    @Expose()
    findings: Finding[] = []
}

export const toDetectionResponse = (detectionEntity: DetectionResponse): DetectionResponseDTO => {
    return plainToInstance(DetectionResponseDTO, detectionEntity, { excludeExtraneousValues: true })
}

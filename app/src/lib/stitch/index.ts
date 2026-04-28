import { StitchSdkProvider } from "@/lib/stitch/sdk-provider"
import { StitchService } from "@/lib/stitch/service"

let service: StitchService | undefined

export function getStitchService(): StitchService {
    if (!service) {
        service = new StitchService(new StitchSdkProvider())
    }
    return service
}

export function setStitchService(nextService: StitchService): void {
    service = nextService
}

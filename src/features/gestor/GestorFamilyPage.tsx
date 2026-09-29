import type { AccessContext } from '../../types/access'
import { FamilyCaregiverPage } from '../social/FamilyCaregiverPage'
import type { FamilyCaregiverService } from '../social/family-caregiver-integration'

export function GestorFamilyPage({
  accessContext,
  service,
}: Readonly<{
  accessContext: AccessContext
  service?: FamilyCaregiverService
}>) {
  return (
    <FamilyCaregiverPage
      accessContext={accessContext}
      service={service}
    />
  )
}

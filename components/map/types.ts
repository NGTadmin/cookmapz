import type { Coordinates } from '../../lib/geo';
import type { PurchasedTicket } from '../../screens/cook/types';
import type { LiveStream } from '../../types/live';

export type PickupMapProps = {
  chefs: LiveStream[];
  plates: PurchasedTicket[];
  userLocation?: Coordinates | null;
};

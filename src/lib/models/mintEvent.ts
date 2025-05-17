import { Utils } from '../utils';

export class MintEvent {
  id: string;
  amount: number;
  targetEntityId: string | null; // Entity ID or null for general supply
  month: number;

  constructor({
    id = Utils.uid(),
    amount = 0,
    targetEntityId = null,
    month = 0,
  }: Partial<MintEvent>) {
    this.id = id;
    this.amount = parseFloat(String(amount)) || 0;
    this.targetEntityId = targetEntityId;
    this.month = parseInt(String(month)) || 0;
  }
}

import mongoose from 'mongoose';
import { DrumModel } from '../modules/packing/drum.model';
import { CustomerModel } from '../modules/customers/customer.model';
import { InboundChallanModel } from '../modules/inventory/inbound-challan.model';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/erp_db?replicaSet=rs0&directConnection=true');
  const drums = await DrumModel.find().populate('customerId', 'code name legalName').limit(20).lean();
  console.log('TOTAL_DRUMS:', drums.length);
  for (const d of drums) {
    console.log(JSON.stringify({
      drumNumber: d.drumNumber,
      ownership: d.ownership,
      customerId: d.customerId,
      inboundChallanId: d.inboundChallanId,
      inboundChallanNumber: d.inboundChallanNumber,
      refRgpNumber: d.refRgpNumber,
    }, null, 2));
  }
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

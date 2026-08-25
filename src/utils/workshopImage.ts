import type { ImageSourcePropType } from 'react-native';

const LOGO_WAN_LEGACY = require('../../assets/images/workshop/wan_legacy.jpg');
const LOGO_LHMOTOR = require('../../assets/images/workshop/lhmotor.jpg');
const LOGO_HK_MOTOR = require('../../assets/images/workshop/hk_motor.jpg');
const LOGO_EU_LI = require('../../assets/images/workshop/eu_li.jpg');
const LOGO_HAI_MOTOR = require('../../assets/images/workshop/hai_motor.jpg');
const LOGO_CASTROL_CSL = require('../../assets/images/workshop/castrol_csl.jpg');
const LOGO_PIT_STOP = require('../../assets/images/workshop/pit_stop.jpg');
const LOGO_LIAN_MOTOR = require('../../assets/images/workshop/lian_motor.jpg');
const LOGO_CKT_MOTOR = require('../../assets/images/workshop/ckt_motor.jpg');
const LOGO_CHONG_HUN = require('../../assets/images/workshop/chong_hun.jpg');

export const WORKSHOP_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  // 1. Wan Legacy Motor (Primary Online Partner)
  'b0000000-0000-0000-0000-000000000001': LOGO_WAN_LEGACY,

  // 2. LHMotor @ Kelang Lama
  'b0000000-0000-0000-0000-000000000002': LOGO_LHMOTOR,

  // 3. HK MOTOR KULIM, KEDAH
  'b0000000-0000-0000-0000-000000000003': LOGO_HK_MOTOR,

  // 4. Eu Li Motor Sdn Bhd
  'b0000000-0000-0000-0000-000000000004': LOGO_EU_LI,

  // 5. Hai Motorcycle Enterprise
  'b0000000-0000-0000-0000-000000000005': LOGO_HAI_MOTOR,

  // 6. Castrol Bike Point – Motor shop Yew Ngee
  'b0000000-0000-0000-0000-000000000006': LOGO_CASTROL_CSL,

  // 7. Castrol Bike Point – CSL Brothers – Soon Soon Lee Lee Motor Sdn Bhd
  'b0000000-0000-0000-0000-000000000007': LOGO_CASTROL_CSL,

  // 8. Pit Stop Garage Motorsport
  'b0000000-0000-0000-0000-000000000008': LOGO_PIT_STOP,

  // 9. Lian Motor / Lian Auto Parts Trading
  'b0000000-0000-0000-0000-000000000009': LOGO_LIAN_MOTOR,

  // 10. CKT MOTOR KULIM
  'b0000000-0000-0000-0000-000000000010': LOGO_CKT_MOTOR,

  // 11. Chong Hun Motor Kulim Enterprise
  'b0000000-0000-0000-0000-000000000011': LOGO_CHONG_HUN,
};

/**
 * Returns the exact logo/image for any workshop from the logo/workshop directory,
 * preferring local authentic workshop assets.
 */
export function getWorkshopImageSource(
  workshop?: { id?: string; name?: string; cover_image_url?: string | null } | null
): ImageSourcePropType {
  if (!workshop) {
    return LOGO_WAN_LEGACY;
  }

  // 1. Custom non-placeholder cover image URL
  if (
    workshop.cover_image_url &&
    workshop.cover_image_url.trim() !== '' &&
    !workshop.cover_image_url.includes('unsplash.com') &&
    !workshop.cover_image_url.includes('photo-1619642751034-765dfdf7c58e')
  ) {
    return { uri: workshop.cover_image_url };
  }

  // 2. Map by exact workshop ID
  if (workshop.id && WORKSHOP_IMAGE_MAP[workshop.id]) {
    return WORKSHOP_IMAGE_MAP[workshop.id];
  }

  // 3. Map by workshop name keywords
  const name = (workshop.name || '').toLowerCase();
  if (name.includes('wan legacy')) return LOGO_WAN_LEGACY;
  if (name.includes('ckt motor')) return LOGO_CKT_MOTOR;
  if (name.includes('lhmotor')) return LOGO_LHMOTOR;
  if (name.includes('hk motor')) return LOGO_HK_MOTOR;
  if (name.includes('eu li')) return LOGO_EU_LI;
  if (name.includes('hai motor')) return LOGO_HAI_MOTOR;
  if (name.includes('csl') || name.includes('soon soon lee') || name.includes('yew ngee') || name.includes('castrol')) {
    return LOGO_CASTROL_CSL;
  }
  if (name.includes('pit stop')) return LOGO_PIT_STOP;
  if (name.includes('lian motor') || name.includes('lian auto')) return LOGO_LIAN_MOTOR;
  if (name.includes('chong hun')) return LOGO_CHONG_HUN;

  return LOGO_WAN_LEGACY;
}

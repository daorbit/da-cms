import { SegmentedControl, Tooltip } from '@mantine/core';
import { IconDeviceIpad, IconDeviceLaptop, IconDeviceMobile } from '@tabler/icons-react';
import { DEVICE_ORDER, DEVICE_SPECS, type DeviceId } from './DeviceFrame';

const DEVICE_ICONS: Record<DeviceId, typeof IconDeviceLaptop> = {
  macbook: IconDeviceLaptop,
  ipad: IconDeviceIpad,
  iphone: IconDeviceMobile,
};

interface Props {
  device: DeviceId;
  onChange: (device: DeviceId) => void;
}

/**
 * The laptop / tablet / phone toggle, on its own so every preview in the app
 * offers the same three devices with the same icons in the same order — the
 * full-screen preview and the template picker included.
 */
export function DeviceSwitch({ device, onChange }: Props) {
  return (
    <SegmentedControl
      size="sm"
      value={device}
      onChange={(v) => onChange(v as DeviceId)}
      data={DEVICE_ORDER.map((id) => {
        const Icon = DEVICE_ICONS[id];
        return {
          value: id,
          label: (
            <Tooltip label={DEVICE_SPECS[id].label} position="bottom" withArrow>
              <span
                style={{ display: 'flex', padding: '0 2px' }}
                aria-label={DEVICE_SPECS[id].label}
              >
                <Icon size={20} stroke={1.6} />
              </span>
            </Tooltip>
          ),
        };
      })}
    />
  );
}

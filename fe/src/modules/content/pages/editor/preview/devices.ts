import { IconDeviceIpad, IconDeviceLaptop, IconDeviceMobile } from '@tabler/icons-react';
import { getDevice, type DeviceId as FrameDeviceId } from 'da-frame-set';

export type DeviceId = 'macbook' | 'ipad' | 'iphone';

export const DEVICE_ORDER: DeviceId[] = ['macbook', 'ipad', 'iphone'];

interface DeviceEntry {
  label: string;
  frameId: FrameDeviceId;
  icon: typeof IconDeviceLaptop;
}

export const DEVICES: Record<DeviceId, DeviceEntry> = {
  macbook: { label: 'Desktop', frameId: 'macbook-pro-16', icon: IconDeviceLaptop },
  ipad: { label: 'Tablet', frameId: 'ipad-air', icon: IconDeviceIpad },
  iphone: { label: 'Mobile', frameId: 'iphone-pro', icon: IconDeviceMobile },
};

export const frameId = (device: DeviceId): FrameDeviceId => DEVICES[device].frameId;

export const frameSpec = (device: DeviceId) => getDevice(frameId(device));

import { useEffect, useState } from 'react';
import { Modal, Box } from '@mantine/core';
import { useFitScale } from './useFitScale';
import { DeviceFrame, frameSize, type DeviceId } from './DeviceFrame';
import { PreviewTopbar } from './PreviewTopbar';
import classes from './PreviewModal.module.css';

interface Props {
  opened: boolean;
  onClose: () => void;
  title: string;
  /** URL of the standalone content document to frame. */
  src: string;
}

/**
 * Shows the page's content as it renders, inside a hardware frame at the
 * device's true CSS width, then scaled to fit the stage — a phone layout stays
 * a phone layout whatever room the modal has.
 *
 * Adapted from the forms builder's PreviewModal: same frame, switch and
 * fit-to-stage behaviour, with an iframe on the screen in place of a live
 * component render.
 */
export function ContentPreviewModal({ opened, onClose, title, src }: Props) {
  const [device, setDevice] = useState<DeviceId>('macbook');

  const size = frameSize(device);
  const { ref: stageRef, scale, measured } = useFitScale({
    contentWidth: size.width,
    contentHeight: size.height,
    padding: { x: 64, y: 64 },
  });

  // Back to desktop each time it opens.
  useEffect(() => {
    if (opened) setDevice('macbook');
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      transitionProps={{ transition: 'fade', duration: 150 }}
      classNames={{ content: classes.content, inner: classes.inner }}
      styles={{
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      }}
    >
      <PreviewTopbar
        title={title}
        device={device}
        onDeviceChange={setDevice}
        openHref={src}
        onClose={onClose}
      />

      <Box className={classes.body}>
        <Box className={classes.stage} ref={stageRef}>
          <DeviceFrame device={device} scale={scale} hidden={!measured}>
            {/* Remounted per device and per open so each preview starts fresh
                at that device's width. */}
            <iframe
              key={`${device}-${opened}`}
              src={src}
              title={`${title} preview`}
              style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff' }}
            />
          </DeviceFrame>
        </Box>
      </Box>
    </Modal>
  );
}

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
  /** The page's serialized content, carrying its own inline styling. */
  content: string;
  /** The standalone document, for opening the preview in its own tab. */
  src: string;
}

/**
 * Shows the page's content as it renders, inside a hardware frame at the
 * device's true CSS width, then scaled to fit the stage — a phone layout stays
 * a phone layout whatever room the modal has.
 *
 * Adapted from the forms builder's PreviewModal: same frame, switch and
 * fit-to-stage behaviour, rendering the content directly onto the screen the
 * way the forms builder renders its form. An iframe would be its own document
 * with its own OS-drawn scrollbar, which reads as chrome on a device mock; the
 * content is self-styled, so it needs no document of its own to render.
 */
export function ContentPreviewModal({ opened, onClose, title, content, src }: Props) {
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
                at that device's width. The markup is the editor's own
                serialized output — its text is escaped and its URLs sanitized
                on the way out, and it is the author's own page. */}
            <div
              key={`${device}-${opened}`}
              className={classes.page}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </DeviceFrame>
        </Box>
      </Box>
    </Modal>
  );
}

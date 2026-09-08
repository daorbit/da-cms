import { useEffect, useState } from "react";
import { Modal, Box } from "@mantine/core";
import { DeviceFrame, frameSize, useFitScale } from "da-frame-set";
import { frameId, frameSpec, type DeviceId } from "./devices";
import { PreviewTopbar } from "./PreviewTopbar";
import classes from "./PreviewModal.module.css";

interface Props {
  opened: boolean;
  onClose: () => void;
  title: string;

  content?: string;
  fetchContent?: () => Promise<string>;
  src: string;
}

export function ContentPreviewModal({
  opened,
  onClose,
  title,
  content,
  fetchContent,
  src,
}: Props) {
  const [device, setDevice] = useState<DeviceId>("macbook");
  const [fetched, setFetched] = useState("");

  const size = frameSize(frameSpec(device));
  const {
    ref: stageRef,
    scale,
    measured,
  } = useFitScale({
    contentWidth: size.width,
    contentHeight: size.height,
    padding: { x: 64, y: 64 },
  });

  // Back to desktop each time it opens.
  useEffect(() => {
    if (opened) setDevice("macbook");
  }, [opened]);

  useEffect(() => {
    if (!opened || content !== undefined || !fetchContent) return;

    let current = true;
    setFetched("");
    fetchContent().then(
      (html) => current && setFetched(html),
      () => current && setFetched(""),
    );
    return () => {
      current = false;
    };
  }, [opened, content, fetchContent]);

  const html = content ?? fetched;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      transitionProps={{ transition: "fade", duration: 150 }}
      classNames={{ content: classes.content, inner: classes.inner }}
      styles={{
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
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
          <DeviceFrame device={frameId(device)} scale={scale} hidden={!measured}>
            <div
              key={`${device}-${opened}`}
              className={classes.page}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </DeviceFrame>
        </Box>
      </Box>
    </Modal>
  );
}

import classes from './DeviceFrame.module.css';

export type DeviceId = 'macbook' | 'ipad' | 'iphone';

export interface DeviceSpec {
  id: DeviceId;
  label: string;
  /** The device's real CSS viewport — what the page inside actually reflows against. */
  width: number;
  height: number;
  /** Chassis thickness around the screen, and any extra below it (a laptop's base). */
  bezel: number;
  chromeBelow: number;
}

export const DEVICE_SPECS: Record<DeviceId, DeviceSpec> = {
  // Narrower than a real Air's 1280 so the mock does not dominate the stage;
  // still wide enough that a desktop layout renders as a desktop layout.
  // Bezels mirror each chassis's own padding in DeviceFrame.module.css — thin,
  // as current hardware is. A value that disagrees with the stylesheet becomes
  // dead space inside the measured frame.
  // Labelled by what the respondent is holding, not by a product name: the
  // point is which layout the form falls into, and naming a specific model
  // implies a fidelity the mock does not claim.
  macbook: { id: 'macbook', label: 'Desktop', width: 1152, height: 720, bezel: 9, chromeBelow: 14 },
  ipad: { id: 'ipad', label: 'Tablet', width: 834, height: 1120, bezel: 10, chromeBelow: 0 },
  iphone: { id: 'iphone', label: 'Mobile', width: 402, height: 874, bezel: 10, chromeBelow: 0 },
};

export const DEVICE_ORDER: DeviceId[] = ['macbook', 'ipad', 'iphone'];

/**
 * Outer size of the whole mock, chassis included — what a fit-to-stage scale
 * measures against.
 *
 * These have to match the CSS exactly: any height the stylesheet adds and this
 * does not becomes dead space above or below the frame once it is centered.
 * The laptop's base is wider than its lid, so the width accounts for that too.
 */
export function frameSize(device: DeviceId): { width: number; height: number } {
  const spec = DEVICE_SPECS[device];
  // The camera strip above the screen on the lid and the iPad's bezel.
  const cameraStrip = device === 'iphone' ? 0 : CAMERA_STRIP;
  const baseOverhang = device === 'macbook' ? MACBOOK_BASE_OVERHANG * 2 : 0;
  return {
    width: spec.width + spec.bezel * 2 + baseOverhang,
    height: spec.height + spec.bezel * 2 + spec.chromeBelow + cameraStrip,
  };
}

/** Height of the strip holding the camera dot, above the screen. Mirrors `.macbookScreen`/`.ipadScreen` margin-top. */
const CAMERA_STRIP = 14;

/** How far the laptop's base sticks out past its lid on each side. Mirrors `.macbookBase` width. */
const MACBOOK_BASE_OVERHANG = 26;

interface Props {
  device: DeviceId;
  /** Shrinks the whole frame to fit the available space; the page inside still renders at full size. */
  scale: number;
  /**
   * Laid out but not painted, for the frame or two before `scale` has been
   * measured — without it the frame appears once at full size and overflows
   * its stage. Hidden rather than unrendered because the stage is measured
   * against what is inside it.
   */
  hidden?: boolean;
  children: React.ReactNode;
}

/**
 * A hardware mock around the previewed page.
 *
 * The screen renders at the device's true CSS viewport and is then scaled down
 * to fit — scaling the frame rather than narrowing it is what keeps the
 * preview honest: a 402px-wide phone layout stays a phone layout, whatever
 * room the modal has.
 */
export function DeviceFrame({ device, scale, hidden, children }: Props) {
  const spec = DEVICE_SPECS[device];
  const size = frameSize(device);
  const screenStyle = { width: spec.width, height: spec.height };

  // Scaling shrinks paint but not layout, so the untransformed size would keep
  // reserving space in the stage. The wrapper is set to the *scaled* size and
  // the frame is pinned inside it, which keeps the mock centered with no dead
  // margin around it.
  return (
    <div
      className={classes.frame}
      style={{
        width: size.width * scale,
        height: size.height * scale,
        visibility: hidden ? 'hidden' : undefined,
      }}
    >
      <div
        className={classes.inner}
        style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
      >
        {device === 'macbook' && (
          <div key="macbook" className={`${classes.macbook} ${classes.chassis}`}>
            <div className={classes.macbookLid}>
              <div className={classes.macbookCamera} />
              <div className={`${classes.screen} ${classes.macbookScreen}`} style={screenStyle}>
                {children}
              </div>
            </div>
            <div className={classes.macbookBase} />
          </div>
        )}

        {device === 'ipad' && (
          <div key="ipad" className={`${classes.ipad} ${classes.chassis}`}>
            <div className={classes.ipadCamera} />
            <div className={`${classes.screen} ${classes.ipadScreen}`} style={screenStyle}>
              {children}
            </div>
          </div>
        )}

        {device === 'iphone' && (
          <div key="iphone" className={`${classes.iphone} ${classes.chassis}`}>
            <span className={`${classes.buttonLeft} ${classes.silenceSwitch}`} />
            <span className={`${classes.buttonLeft} ${classes.volumeUp}`} />
            <span className={`${classes.buttonLeft} ${classes.volumeDown}`} />
            <span className={classes.buttonRight} />
            <div className={classes.island} />
            <div className={`${classes.screen} ${classes.iphoneScreen}`} style={screenStyle}>
              {children}
            </div>
            <div className={classes.homeIndicator} />
          </div>
        )}
      </div>
    </div>
  );
}

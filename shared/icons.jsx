export function Icon({ name = 'arrow', size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M5 19 19 5M5 5h14v14" /></>,
    back: <><path d="m10 5-7 7 7 7M3 12h18" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z" /><circle cx="12" cy="13" r="4" /></>,
    close: <><path d="m5 5 14 14M19 5 5 19" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m16 8-3 5-5 3 3-5Z" /></>,
    up: <><path d="M12 20V4m-7 7 7-7 7 7" /></>,
    down: <><path d="M12 4v16m-7-7 7 7 7-7" /></>,
    left: <><path d="M20 12H4m7-7-7 7 7 7" /></>,
    right: <><path d="M4 12h16m-7-7 7 7-7 7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] ?? paths.arrow}</svg>;
}

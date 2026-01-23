export function openCenteredPopup(url, title = 'Login', w = 520, h = 640) {
  const dualScreenLeft = (window.screenLeft ?? window.screenX ?? 0);
  const dualScreenTop  = (window.screenTop  ?? window.screenY ?? 0);
  const width  = (window.innerWidth  ?? document.documentElement.clientWidth  ?? screen.width);
  const height = (window.innerHeight ?? document.documentElement.clientHeight ?? screen.height);
  const left = Math.max(0, (width - w) / 2 + dualScreenLeft);
  const top  = Math.max(0, (height - h) / 2 + dualScreenTop);
  const features = `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`;
  return window.open(url, title, features);
}

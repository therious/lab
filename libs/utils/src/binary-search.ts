export function bsearch<T>(arr: T[], v: T): number {
  let left  = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    if (arr[mid] === v) return mid;
    if (arr[mid] < v)   left  = mid + 1;
    else                right = mid - 1;
  }
  return -1
}


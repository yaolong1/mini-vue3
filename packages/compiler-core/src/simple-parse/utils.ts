

/**
 * 判断当前是否是英文字母
 * @param char 
 */
export function isAlpha(char) {
  return /[a-z | A-Z]/.test(char)
}


export function isChines(str) {
  return (/.*[\u4e00-\u9fa5]+.*/.test(str))
}

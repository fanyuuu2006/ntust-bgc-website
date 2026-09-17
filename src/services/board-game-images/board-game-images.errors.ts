export class BoardGameImageInputError extends Error { constructor(message:string){super(message);this.name="BoardGameImageInputError";} }
export class BoardGameImageMutationConflictError extends Error { constructor(){super("桌遊圖片已由其他操作更新，請重新載入後再試");this.name="BoardGameImageMutationConflictError";} }

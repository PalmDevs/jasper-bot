export const UserErrorType = {
    Generic: 1,
    Usage: 2,
} as const

export class UserError extends Error {
    constructor(
        message: string,
        public type: (typeof UserErrorType)[keyof typeof UserErrorType] = UserErrorType.Generic,
    ) {
        super(message)
        this.name = 'UserError'
    }
}

export class SelfError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SelfError'
    }
}

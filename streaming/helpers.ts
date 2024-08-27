export function isValidMessage (message: any): boolean {
    return typeof message === 'object' &&
    'role' in message &&
    'content' in message &&
    typeof message.content === 'string'

}
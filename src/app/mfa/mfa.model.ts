export interface Mfa {
    id: string;
    secret: string;
    issuer: string;
    username: string;
    code: string;
}

import { HttpException } from "@nestjs/common";

/**
 * Defines an intentional public error contract.
 * Only pass messages safe for clients; never raw database/provider errors.
 */

export class PublicHttpException extends HttpException{
    constructor(statusCode: number, code: string, message:string){
        super({statusCode, code, message}, statusCode);
    }
}
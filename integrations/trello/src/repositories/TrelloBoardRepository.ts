import 'reflect-metadata'
import { TrelloClient } from 'trello.js'
import { inject, injectable } from 'tsyringe'
import { IBoardRepository } from '../interfaces/repositories/IBoardRepository'
import { DIToken } from '../iocContainer'
import { Board } from '../schemas/entities/Board'
import { List } from '../schemas/entities/List'
import { BaseRepository } from './BaseRepository'


@injectable()
export class TrelloBoardRepository extends BaseRepository implements IBoardRepository {
    constructor(@inject(DIToken.TrelloClient) trelloClient: TrelloClient) {
        super(trelloClient)
    }

    async getAllBoards(): Promise<Board[]> {
        try {
            return await this.trelloClient.members.getMemberBoards({
                id: 'me'
            })
        } catch (error) {
            this.handleError('getAllBoards', error)
        }
    }

    async getListsInBoard(boardId: Board['id']): Promise<List[]> {
        try {
            return await this.trelloClient.boards.getBoardLists({
                id: boardId
            })
        } catch (error) {
            this.handleError(`getListsInBoard for board ${boardId}`, error)
        }
    }
}

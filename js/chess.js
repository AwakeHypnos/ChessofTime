/**
 * ChessTime - 国际象棋核心逻辑
 * 实现棋盘、棋子、移动规则等核心功能 - 支持时间旅行规则
 */

const PieceType = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

const Color = {
    WHITE: 'white',
    BLACK: 'black'
};

const PieceStatus = {
    NORMAL: 'normal',
    SPECTATOR: 'spectator',
    BANISHED: 'banished'
};

const TimelineType = {
    SINGLE: 'single',
    SPLIT: 'split'
};

const BoardTime = {
    PAST: 'past',
    PRESENT: 'present'
};

const MoveType = {
    NORMAL: 'normal',
    TIME_TRAVEL: 'time_travel'
};

const ScoreConfig = {
    PIECE_MULTIPLIER: 1.0,
    SPECTATOR_PENALTY: 0.5,
    BANISHED_PENALTY: 0.0
};

const PieceSymbols = {
    [Color.WHITE]: {
        [PieceType.KING]: '♔',
        [PieceType.QUEEN]: '♕',
        [PieceType.ROOK]: '♖',
        [PieceType.BISHOP]: '♗',
        [PieceType.KNIGHT]: '♘',
        [PieceType.PAWN]: '♙'
    },
    [Color.BLACK]: {
        [PieceType.KING]: '♚',
        [PieceType.QUEEN]: '♛',
        [PieceType.ROOK]: '♜',
        [PieceType.BISHOP]: '♝',
        [PieceType.KNIGHT]: '♞',
        [PieceType.PAWN]: '♟'
    }
};

const PieceValue = {
    [PieceType.KING]: 20000,
    [PieceType.QUEEN]: 900,
    [PieceType.ROOK]: 500,
    [PieceType.BISHOP]: 330,
    [PieceType.KNIGHT]: 320,
    [PieceType.PAWN]: 100
};

class Piece {
    constructor(type, color) {
        this.type = type;
        this.color = color;
        this.hasMoved = false;
        this.status = PieceStatus.NORMAL;
        this.isFromTimeTravel = false;
    }

    getSymbol() {
        return PieceSymbols[this.color][this.type];
    }

    clone() {
        const piece = new Piece(this.type, this.color);
        piece.hasMoved = this.hasMoved;
        piece.status = this.status;
        piece.isFromTimeTravel = this.isFromTimeTravel;
        return piece;
    }

    isSpectator() {
        return this.status === PieceStatus.SPECTATOR;
    }

    isBanished() {
        return this.status === PieceStatus.BANISHED;
    }

    isNormal() {
        return this.status === PieceStatus.NORMAL;
    }

    setStatus(status) {
        this.status = status;
    }
}

class Move {
    constructor(fromRow, fromCol, toRow, toCol, piece, capturedPiece = null, isCastling = false, isEnPassant = false, promotionType = null) {
        this.fromRow = fromRow;
        this.fromCol = fromCol;
        this.toRow = toRow;
        this.toCol = toCol;
        this.piece = piece;
        this.capturedPiece = capturedPiece;
        this.isCastling = isCastling;
        this.isEnPassant = isEnPassant;
        this.promotionType = promotionType;
        this.moveType = MoveType.NORMAL;
    }
}

class Board {
    constructor() {
        this.grid = this.createEmptyBoard();
        this.setupInitialPosition();
        this.enPassantTarget = null;
        this.castlingRights = {
            [Color.WHITE]: { kingSide: true, queenSide: true },
            [Color.BLACK]: { kingSide: true, queenSide: true }
        };
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.boardTime = BoardTime.PRESENT;
    }

    createEmptyBoard() {
        return Array(8).fill(null).map(() => Array(8).fill(null));
    }

    setupInitialPosition() {
        this.grid[0][0] = new Piece(PieceType.ROOK, Color.BLACK);
        this.grid[0][1] = new Piece(PieceType.KNIGHT, Color.BLACK);
        this.grid[0][2] = new Piece(PieceType.BISHOP, Color.BLACK);
        this.grid[0][3] = new Piece(PieceType.QUEEN, Color.BLACK);
        this.grid[0][4] = new Piece(PieceType.KING, Color.BLACK);
        this.grid[0][5] = new Piece(PieceType.BISHOP, Color.BLACK);
        this.grid[0][6] = new Piece(PieceType.KNIGHT, Color.BLACK);
        this.grid[0][7] = new Piece(PieceType.ROOK, Color.BLACK);
        for (let col = 0; col < 8; col++) {
            this.grid[1][col] = new Piece(PieceType.PAWN, Color.BLACK);
        }

        this.grid[7][0] = new Piece(PieceType.ROOK, Color.WHITE);
        this.grid[7][1] = new Piece(PieceType.KNIGHT, Color.WHITE);
        this.grid[7][2] = new Piece(PieceType.BISHOP, Color.WHITE);
        this.grid[7][3] = new Piece(PieceType.QUEEN, Color.WHITE);
        this.grid[7][4] = new Piece(PieceType.KING, Color.WHITE);
        this.grid[7][5] = new Piece(PieceType.BISHOP, Color.WHITE);
        this.grid[7][6] = new Piece(PieceType.KNIGHT, Color.WHITE);
        this.grid[7][7] = new Piece(PieceType.ROOK, Color.WHITE);
        for (let col = 0; col < 8; col++) {
            this.grid[6][col] = new Piece(PieceType.PAWN, Color.WHITE);
        }
    }

    getPiece(row, col) {
        if (row < 0 || row >= 8 || col < 0 || col >= 8) {
            return null;
        }
        return this.grid[row][col];
    }

    setPiece(row, col, piece) {
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            this.grid[row][col] = piece;
        }
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    clone() {
        const newBoard = new Board();
        newBoard.grid = this.createEmptyBoard();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.grid[row][col]) {
                    newBoard.grid[row][col] = this.grid[row][col].clone();
                }
            }
        }
        newBoard.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        newBoard.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
        newBoard.halfMoveClock = this.halfMoveClock;
        newBoard.fullMoveNumber = this.fullMoveNumber;
        newBoard.boardTime = this.boardTime;
        return newBoard;
    }

    setBoardTime(boardTime) {
        this.boardTime = boardTime;
    }

    getBoardTime() {
        return this.boardTime;
    }

    isPastBoard() {
        return this.boardTime === BoardTime.PAST;
    }

    isPresentBoard() {
        return this.boardTime === BoardTime.PRESENT;
    }

    getTimeTravelMoves(row, col, targetBoard = null) {
        const piece = this.grid[row][col];
        if (!piece || piece.isSpectator() || piece.isBanished()) {
            return [];
        }

        if (piece.type === PieceType.KING) {
            console.log('王不能进行时间穿越');
            return [];
        }

        const isInCheck = this.isInCheck(piece.color);
        
        if (isInCheck) {
            const kingPos = this.findKing(piece.color);
            if (kingPos) {
                const opponentColor = piece.color === Color.WHITE ? Color.BLACK : Color.WHITE;
                const attackingPieces = this.findAttackingPieces(kingPos.row, kingPos.col, opponentColor);
                
                for (const attacker of attackingPieces) {
                    const isPieceBlocking = this.isPieceBlockingAttack(
                        row, col, kingPos, attacker
                    );
                    if (isPieceBlocking) {
                        console.log('棋子正遮挡王，不能进行时间穿越');
                        return [];
                    }
                }
            }
        }

        const boardToUse = targetBoard || this;
        const pieceMoves = boardToUse.getPieceMoves(row, col);
        
        const validTimeTravelMoves = [];
        for (const move of pieceMoves) {
            const targetPiece = boardToUse.getPiece(move.toRow, move.toCol);
            if (!targetPiece) {
                validTimeTravelMoves.push(new Move(row, col, move.toRow, move.toCol, piece, null));
            }
        }
        
        return validTimeTravelMoves;
    }

    findAttackingPieces(targetRow, targetCol, attackingColor) {
        const attackers = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.grid[r][c];
                if (piece && piece.color === attackingColor && piece.isNormal()) {
                    const moves = this.getPieceMoves(r, c, true);
                    for (const move of moves) {
                        if (move.toRow === targetRow && move.toCol === targetCol) {
                            attackers.push({ row: r, col: c, piece });
                            break;
                        }
                    }
                }
            }
        }
        return attackers;
    }

    isPieceBlockingAttack(pieceRow, pieceCol, kingPos, attacker) {
        const piece = this.grid[pieceRow][pieceCol];
        if (!piece) return false;

        const { row: attackerRow, col: attackerCol } = attacker;
        const { row: kingRow, col: kingCol } = kingPos;

        const attackerPiece = attacker.piece;
        if (!attackerPiece) return false;

        if (attackerPiece.type === PieceType.KNIGHT) {
            return false;
        }

        const isPieceBetweenKingAndAttacker = this.isSquareBetweenPoints(
            pieceRow, pieceCol,
            attackerRow, attackerCol,
            kingRow, kingCol
        );

        return isPieceBetweenKingAndAttacker;
    }

    isSquareBetweenPoints(row, col, fromRow, fromCol, toRow, toCol) {
        const dr = toRow - fromRow;
        const dc = toCol - fromCol;

        if (dr === 0) {
            if (row !== fromRow) return false;
            const minCol = Math.min(fromCol, toCol);
            const maxCol = Math.max(fromCol, toCol);
            return col > minCol && col < maxCol;
        }

        if (dc === 0) {
            if (col !== fromCol) return false;
            const minRow = Math.min(fromRow, toRow);
            const maxRow = Math.max(fromRow, toRow);
            return row > minRow && row < maxRow;
        }

        if (Math.abs(dr) === Math.abs(dc)) {
            const dRow = row - fromRow;
            const dCol = col - fromCol;
            
            if (Math.abs(dRow) !== Math.abs(dCol)) return false;
            
            const signRow = dr > 0 ? 1 : -1;
            const signCol = dc > 0 ? 1 : -1;
            
            if (dRow * signRow < 0 || dCol * signCol < 0) return false;
            
            return Math.abs(dRow) < Math.abs(dr);
        }

        return false;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.grid[row][col];
                if (piece && piece.type === PieceType.KING && piece.color === color && !piece.isBanished()) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, attackingColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.grid[r][c];
                if (piece && piece.color === attackingColor && piece.isNormal()) {
                    const moves = this.getPieceMoves(r, c, true);
                    for (const move of moves) {
                        if (move.toRow === row && move.toCol === col) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
        return this.isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
    }

    getPieceMoves(row, col, attackOnly = false) {
        const piece = this.grid[row][col];
        if (!piece) return [];

        const moves = [];
        const direction = piece.color === Color.WHITE ? -1 : 1;

        switch (piece.type) {
            case PieceType.PAWN:
                moves.push(...this.getPawnMoves(row, col, direction, piece.color, attackOnly));
                break;
            case PieceType.ROOK:
                moves.push(...this.getRookMoves(row, col, piece.color, attackOnly));
                break;
            case PieceType.BISHOP:
                moves.push(...this.getBishopMoves(row, col, piece.color, attackOnly));
                break;
            case PieceType.QUEEN:
                moves.push(...this.getRookMoves(row, col, piece.color, attackOnly));
                moves.push(...this.getBishopMoves(row, col, piece.color, attackOnly));
                break;
            case PieceType.KNIGHT:
                moves.push(...this.getKnightMoves(row, col, piece.color, attackOnly));
                break;
            case PieceType.KING:
                moves.push(...this.getKingMoves(row, col, piece.color, attackOnly));
                break;
        }

        return moves;
    }

    getPawnMoves(row, col, direction, color, attackOnly) {
        const moves = [];
        const startRow = color === Color.WHITE ? 6 : 1;

        if (!attackOnly) {
            if (this.isValidPosition(row + direction, col) && !this.grid[row + direction][col]) {
                moves.push(new Move(row, col, row + direction, col, this.grid[row][col]));
                
                if (row === startRow && !this.grid[row + 2 * direction][col]) {
                    moves.push(new Move(row, col, row + 2 * direction, col, this.grid[row][col]));
                }
            }
        }

        const captureDirections = [
            { dr: direction, dc: -1 },
            { dr: direction, dc: 1 }
        ];

        for (const { dr, dc } of captureDirections) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.grid[newRow][newCol];
                
                if (attackOnly) {
                    if (!target || target.color !== color) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], target));
                    }
                } else {
                    if (target && target.color !== color) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], target));
                    }
                    
                    if (this.enPassantTarget && 
                        this.enPassantTarget.row === newRow && 
                        this.enPassantTarget.col === newCol) {
                        const capturedPawnRow = color === Color.WHITE ? newRow + 1 : newRow - 1;
                        const capturedPawn = this.grid[capturedPawnRow][newCol];
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], capturedPawn, false, true));
                    }
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col, color, attackOnly) {
        const moves = [];
        const directions = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        for (const { dr, dc } of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            
            while (this.isValidPosition(newRow, newCol)) {
                const target = this.grid[newRow][newCol];
                
                if (!target) {
                    if (!attackOnly) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col]));
                    }
                } else {
                    if (target.color !== color) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], target));
                    }
                    break;
                }
                
                newRow += dr;
                newCol += dc;
            }
        }

        return moves;
    }

    getBishopMoves(row, col, color, attackOnly) {
        const moves = [];
        const directions = [
            { dr: -1, dc: -1 },
            { dr: -1, dc: 1 },
            { dr: 1, dc: -1 },
            { dr: 1, dc: 1 }
        ];

        for (const { dr, dc } of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            
            while (this.isValidPosition(newRow, newCol)) {
                const target = this.grid[newRow][newCol];
                
                if (!target) {
                    if (!attackOnly) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col]));
                    }
                } else {
                    if (target.color !== color) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], target));
                    }
                    break;
                }
                
                newRow += dr;
                newCol += dc;
            }
        }

        return moves;
    }

    getKnightMoves(row, col, color, attackOnly) {
        const moves = [];
        const offsets = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];

        for (const { dr, dc } of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.grid[newRow][newCol];
                
                if (!target) {
                    if (!attackOnly) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col]));
                    }
                } else if (target.color !== color) {
                    moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], target));
                }
            }
        }

        return moves;
    }

    getKingMoves(row, col, color, attackOnly) {
        const moves = [];
        const offsets = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];

        for (const { dr, dc } of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.grid[newRow][newCol];
                
                if (!target) {
                    if (!attackOnly) {
                        moves.push(new Move(row, col, newRow, newCol, this.grid[row][col]));
                    }
                } else if (target.color !== color) {
                    moves.push(new Move(row, col, newRow, newCol, this.grid[row][col], target));
                }
            }
        }

        if (!attackOnly && !this.isInCheck(color)) {
            const kingRow = color === Color.WHITE ? 7 : 0;
            
            if (row === kingRow && col === 4 && this.grid[row][col]) {
                if (this.castlingRights[color].kingSide) {
                    if (!this.grid[kingRow][5] && !this.grid[kingRow][6]) {
                        const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
                        if (!this.isSquareAttacked(kingRow, 5, opponentColor) && 
                            !this.isSquareAttacked(kingRow, 6, opponentColor)) {
                            moves.push(new Move(row, col, kingRow, 6, this.grid[row][col], null, true));
                        }
                    }
                }
                
                if (this.castlingRights[color].queenSide) {
                    if (!this.grid[kingRow][1] && !this.grid[kingRow][2] && !this.grid[kingRow][3]) {
                        const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
                        if (!this.isSquareAttacked(kingRow, 2, opponentColor) && 
                            !this.isSquareAttacked(kingRow, 3, opponentColor)) {
                            moves.push(new Move(row, col, kingRow, 2, this.grid[row][col], null, true));
                        }
                    }
                }
            }
        }

        return moves;
    }

    getLegalMoves(row, col) {
        const piece = this.grid[row][col];
        if (!piece) return [];

        const moves = this.getPieceMoves(row, col);
        const legalMoves = [];

        for (const move of moves) {
            const boardClone = this.clone();
            boardClone.makeMove(move, true);
            
            if (!boardClone.isInCheck(piece.color)) {
                legalMoves.push(move);
            }
        }

        return legalMoves;
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.grid[row][col];
                if (piece && piece.color === color && piece.isNormal()) {
                    moves.push(...this.getLegalMoves(row, col));
                }
            }
        }
        return moves;
    }

    makeMove(move, isSimulation = false) {
        const { fromRow, fromCol, toRow, toCol, piece, isCastling, isEnPassant, promotionType } = move;
        
        if (isCastling) {
            const kingRow = fromRow;
            const isKingSide = toCol === 6;
            
            const king = this.grid[kingRow][4];
            if (!king) {
                return;
            }
            
            this.grid[kingRow][toCol] = king;
            this.grid[kingRow][4] = null;
            
            if (isKingSide) {
                const rook = this.grid[kingRow][7];
                if (rook) {
                    this.grid[kingRow][5] = rook;
                    this.grid[kingRow][7] = null;
                    rook.hasMoved = true;
                }
            } else {
                const rook = this.grid[kingRow][0];
                if (rook) {
                    this.grid[kingRow][3] = rook;
                    this.grid[kingRow][0] = null;
                    rook.hasMoved = true;
                }
            }
            
            king.hasMoved = true;
        } else if (isEnPassant) {
            const capturedPawnRow = piece.color === Color.WHITE ? toRow + 1 : toRow - 1;
            const capturedPawn = this.grid[capturedPawnRow][toCol];
            
            const movingPiece = this.grid[fromRow][fromCol];
            if (!movingPiece) {
                return;
            }
            
            this.grid[toRow][toCol] = movingPiece;
            this.grid[fromRow][fromCol] = null;
            this.grid[capturedPawnRow][toCol] = null;
            
            movingPiece.hasMoved = true;
        } else {
            this.grid[toRow][toCol] = this.grid[fromRow][fromCol];
            this.grid[fromRow][fromCol] = null;
            
            if (this.grid[toRow][toCol]) {
                this.grid[toRow][toCol].hasMoved = true;
            }
        }

        if (promotionType) {
            this.grid[toRow][toCol] = new Piece(promotionType, piece.color);
            this.grid[toRow][toCol].hasMoved = true;
        } else if (piece.type === PieceType.PAWN && (toRow === 0 || toRow === 7)) {
            this.grid[toRow][toCol] = new Piece(PieceType.QUEEN, piece.color);
            this.grid[toRow][toCol].hasMoved = true;
        }

        if (!isSimulation) {
            if (piece.type === PieceType.PAWN && Math.abs(toRow - fromRow) === 2) {
                const enPassantRow = piece.color === Color.WHITE ? fromRow - 1 : fromRow + 1;
                this.enPassantTarget = { row: enPassantRow, col: fromCol };
            } else {
                this.enPassantTarget = null;
            }

            if (piece.type === PieceType.KING) {
                this.castlingRights[piece.color].kingSide = false;
                this.castlingRights[piece.color].queenSide = false;
            }
            if (piece.type === PieceType.ROOK) {
                if (fromCol === 0) {
                    this.castlingRights[piece.color].queenSide = false;
                }
                if (fromCol === 7) {
                    this.castlingRights[piece.color].kingSide = false;
                }
            }

            if (piece.type === PieceType.PAWN || move.capturedPiece) {
                this.halfMoveClock = 0;
            } else {
                this.halfMoveClock++;
            }

            if (piece.color === Color.BLACK) {
                this.fullMoveNumber++;
            }
        }
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        return this.getAllLegalMoves(color).length === 0;
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        return this.getAllLegalMoves(color).length === 0;
    }

    isGameOver() {
        return this.isCheckmate(Color.WHITE) || 
               this.isCheckmate(Color.BLACK) || 
               this.isStalemate(Color.WHITE) || 
               this.isStalemate(Color.BLACK);
    }

    getWinner() {
        if (this.isCheckmate(Color.WHITE)) return Color.BLACK;
        if (this.isCheckmate(Color.BLACK)) return Color.WHITE;
        return null;
    }
}

class GameHistory {
    constructor() {
        this.moves = [];
        this.boardStates = [];
    }

    addMove(move, board) {
        this.moves.push(move);
        this.boardStates.push(board.clone());
    }

    undo() {
        if (this.moves.length === 0) return null;
        
        const lastMove = this.moves.pop();
        const lastBoard = this.boardStates.pop();
        
        return { move: lastMove, board: lastBoard };
    }

    size() {
        return this.moves.length;
    }

    clear() {
        this.moves = [];
        this.boardStates = [];
    }
}

class TimelineManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.presentBoard = new Board();
        this.presentBoard.setBoardTime(BoardTime.PRESENT);
        this.pastBoard = null;
        this.activeBoard = this.presentBoard;
        this.timelineType = TimelineType.SINGLE;
        this.banishedPieces = [];
    }

    getPresentBoard() {
        return this.presentBoard;
    }

    getPastBoard() {
        return this.pastBoard;
    }

    getActiveBoard() {
        return this.activeBoard;
    }

    setActiveBoard(boardTime) {
        if (boardTime === BoardTime.PAST && this.pastBoard) {
            this.activeBoard = this.pastBoard;
        } else {
            this.activeBoard = this.presentBoard;
        }
    }

    isSplit() {
        return this.timelineType === TimelineType.SPLIT;
    }

    canTimeTravel() {
        return !this.isSplit();
    }

    getBanishedPieces() {
        return this.banishedPieces;
    }

    splitTimeline(initialPastBoard = null) {
        if (this.isSplit()) {
            return false;
        }
        
        if (initialPastBoard) {
            this.pastBoard = initialPastBoard.clone();
        } else {
            this.pastBoard = this.presentBoard.clone();
        }
        
        this.pastBoard.setBoardTime(BoardTime.PAST);
        this.timelineType = TimelineType.SPLIT;
        this.activeBoard = this.presentBoard;
        
        return true;
    }

    performTimeTravel(fromRow, fromCol, toRow, toCol, targetBoard = null) {
        if (!this.canTimeTravel()) {
            return false;
        }

        const piece = this.presentBoard.getPiece(fromRow, fromCol);
        if (!piece) {
            return false;
        }

        const targetPiece = this.presentBoard.getPiece(toRow, toCol);

        if (targetBoard) {
            this.splitTimeline(targetBoard);
        } else {
            this.splitTimeline();
        }

        const timeTravelPiece = new Piece(piece.type, piece.color);
        timeTravelPiece.hasMoved = true;
        timeTravelPiece.isFromTimeTravel = true;
        timeTravelPiece.setStatus(PieceStatus.SPECTATOR);

        const existingTarget = this.pastBoard.getPiece(toRow, toCol);
        if (existingTarget) {
            this.pastBoard.setPiece(fromRow, fromCol, existingTarget);
            this.banishedPieces.push(existingTarget);
        } else {
            this.presentBoard.setPiece(fromRow, fromCol, null);
        }

        this.pastBoard.setPiece(toRow, toCol, timeTravelPiece);

        this.activeBoard = this.presentBoard;

        return true;
    }

    calculateMaterialScore(board, color) {
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPiece(row, col);
                if (piece && piece.color === color) {
                    let multiplier = ScoreConfig.PIECE_MULTIPLIER;
                    if (piece.isSpectator()) {
                        multiplier = ScoreConfig.SPECTATOR_PENALTY;
                    } else if (piece.isBanished()) {
                        multiplier = ScoreConfig.BANISHED_PENALTY;
                    }
                    score += PieceValue[piece.type] * multiplier;
                }
            }
        }
        return score;
    }

    calculateEndGameScores() {
        let playerTotal = 0;
        let aiTotal = 0;

        if (this.isSplit()) {
            playerTotal += this.calculateMaterialScore(this.presentBoard, Color.WHITE);
            playerTotal += this.calculateMaterialScore(this.pastBoard, Color.WHITE);
            aiTotal += this.calculateMaterialScore(this.presentBoard, Color.BLACK);
            aiTotal += this.calculateMaterialScore(this.pastBoard, Color.BLACK);
        } else {
            playerTotal += this.calculateMaterialScore(this.presentBoard, Color.WHITE);
            aiTotal += this.calculateMaterialScore(this.presentBoard, Color.BLACK);
        }

        const playerNetScore = (playerTotal - aiTotal) / 100.0;
        const aiNetScore = (aiTotal - playerTotal) / 100.0;

        return {
            player: playerNetScore,
            ai: aiNetScore,
            playerTotal: playerTotal / 100.0,
            aiTotal: aiTotal / 100.0
        };
    }

    getWinnerByScore() {
        const scores = this.calculateEndGameScores();
        if (scores.player > scores.ai) {
            return Color.WHITE;
        } else if (scores.ai > scores.player) {
            return Color.BLACK;
        }
        return null;
    }
}

window.ChessTime = {
    PieceType,
    Color,
    PieceStatus,
    TimelineType,
    BoardTime,
    MoveType,
    ScoreConfig,
    PieceSymbols,
    PieceValue,
    Piece,
    Move,
    Board,
    GameHistory,
    TimelineManager
};

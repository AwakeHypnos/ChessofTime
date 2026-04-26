/**
 * ChessTime - 国际象棋核心逻辑
 * 实现棋盘、棋子、移动规则等核心功能
 */

// 棋子类型
const PieceType = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

// 颜色
const Color = {
    WHITE: 'white',
    BLACK: 'black'
};

// 棋子Unicode字符
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

// 棋子状态枚举
const PieceStatus = {
    NORMAL: 'normal',
    SPECTATOR: 'spectator',
    BANISHED: 'banished'
};

// 时间线类型
const TimelineType = {
    SINGLE: 'single',
    SPLIT: 'split'
};

// 棋盘时间标识
const BoardTime = {
    PRESENT: 'present',
    PAST: 'past'
};

// 棋子类
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

    markAsSpectator() {
        this.status = PieceStatus.SPECTATOR;
    }

    markAsBanished() {
        this.status = PieceStatus.BANISHED;
    }

    isSpectator() {
        return this.status === PieceStatus.SPECTATOR;
    }

    isBanished() {
        return this.status === PieceStatus.BANISHED;
    }
}

// 移动类型枚举
const MoveType = {
    NORMAL: 'normal',
    TIME_TRAVEL: 'time_travel',
    CAPTURE_IN_PAST: 'capture_in_past',
    CAPTURE_IN_PRESENT: 'capture_in_present'
};

// 移动类
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

// 时间移动类
class TimeTravelMove extends Move {
    constructor(fromRow, fromCol, toRow, toCol, piece, targetTime) {
        super(fromRow, fromCol, toRow, toCol, piece, null, false, false, null);
        this.moveType = MoveType.TIME_TRAVEL;
        this.targetTime = targetTime;
        this.isSpectatorMove = true;
    }
}

// 棋盘类
class Board {
    constructor(boardTime = BoardTime.PRESENT) {
        this.grid = this.createEmptyBoard();
        this.setupInitialPosition();
        this.enPassantTarget = null;
        this.castlingRights = {
            [Color.WHITE]: { kingSide: true, queenSide: true },
            [Color.BLACK]: { kingSide: true, queenSide: true }
        };
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.boardTime = boardTime;
        this.linkedBoard = null;
        this.timeTravelMoves = [];
    }

    setBoardTime(boardTime) {
        this.boardTime = boardTime;
    }

    getBoardTime() {
        return this.boardTime;
    }

    setLinkedBoard(board) {
        this.linkedBoard = board;
    }

    getLinkedBoard() {
        return this.linkedBoard;
    }

    isPastBoard() {
        return this.boardTime === BoardTime.PAST;
    }

    isPresentBoard() {
        return this.boardTime === BoardTime.PRESENT;
    }

    getTimeTravelMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece || piece.isSpectator() || piece.isBanished()) {
            return [];
        }

        if (this.isPastBoard()) {
            return [];
        }

        const moves = [];
        const allMoves = this.getPieceMoves(row, col);
        
        for (const move of allMoves) {
            const targetPiece = this.getPiece(move.toRow, move.toCol);
            if (!targetPiece) {
                const timeMove = new TimeTravelMove(
                    move.fromRow, 
                    move.fromCol, 
                    move.toRow, 
                    move.toCol, 
                    piece,
                    BoardTime.PAST
                );
                moves.push(timeMove);
            }
        }

        return moves;
    }

    isTimeTravelMove(move) {
        return move.moveType === MoveType.TIME_TRAVEL;
    }

    createEmptyBoard() {
        return Array(8).fill(null).map(() => Array(8).fill(null));
    }

    setupInitialPosition() {
        // 黑方
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

        // 白方
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
        return newBoard;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.grid[row][col];
                if (piece && piece.type === PieceType.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, attackingColor) {
        const opponentColor = attackingColor;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.grid[r][c];
                if (piece && piece.color === opponentColor) {
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
            
            if (row !== kingRow || col !== 4) {
                return moves;
            }
            
            if (this.castlingRights[color].kingSide) {
                if (!this.grid[kingRow][5] && !this.grid[kingRow][6]) {
                    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
                    if (!this.isSquareAttacked(kingRow, 4, opponentColor) && 
                        !this.isSquareAttacked(kingRow, 5, opponentColor) && 
                        !this.isSquareAttacked(kingRow, 6, opponentColor)) {
                        moves.push(new Move(row, col, kingRow, 6, this.grid[row][col], null, true));
                    }
                }
            }
            
            if (this.castlingRights[color].queenSide) {
                if (!this.grid[kingRow][1] && !this.grid[kingRow][2] && !this.grid[kingRow][3]) {
                    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
                    if (!this.isSquareAttacked(kingRow, 4, opponentColor) && 
                        !this.isSquareAttacked(kingRow, 3, opponentColor) && 
                        !this.isSquareAttacked(kingRow, 2, opponentColor)) {
                        moves.push(new Move(row, col, kingRow, 2, this.grid[row][col], null, true));
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
                if (piece && piece.color === color) {
                    moves.push(...this.getLegalMoves(row, col));
                }
            }
        }
        return moves;
    }

    makeMove(move, isSimulation = false) {
        const { fromRow, fromCol, toRow, toCol, piece, isCastling, isEnPassant, promotionType, moveType } = move;
        
        if (moveType === MoveType.TIME_TRAVEL) {
            return this.makeTimeTravelMove(move, isSimulation);
        }

        const capturedPiece = move.capturedPiece;
        
        if (capturedPiece && this.isPastBoard() && this.linkedBoard) {
            this.propagateCaptureToPresent(capturedPiece);
        }

        if (isCastling) {
            const kingRow = fromRow;
            const isKingSide = toCol === 6;
            
            this.grid[kingRow][toCol] = this.grid[kingRow][4];
            this.grid[kingRow][4] = null;
            
            if (isKingSide) {
                this.grid[kingRow][5] = this.grid[kingRow][7];
                this.grid[kingRow][7] = null;
            } else {
                this.grid[kingRow][3] = this.grid[kingRow][0];
                this.grid[kingRow][0] = null;
            }
            
            if (this.grid[kingRow][toCol]) {
                this.grid[kingRow][toCol].hasMoved = true;
            }
        } else if (isEnPassant) {
            const capturedPawnRow = piece.color === Color.WHITE ? toRow + 1 : toRow - 1;
            const capturedPawn = this.grid[capturedPawnRow][toCol];
            
            if (capturedPawn && this.isPastBoard() && this.linkedBoard) {
                this.propagateCaptureToPresent(capturedPawn);
            }
            
            this.grid[toRow][toCol] = this.grid[fromRow][fromCol];
            this.grid[fromRow][fromCol] = null;
            this.grid[capturedPawnRow][toCol] = null;
            
            this.grid[toRow][toCol].hasMoved = true;
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

        if (!isSimulation) {
            if (piece.type === PieceType.PAWN && Math.abs(toRow - fromRow) === 2) {
                const enPassantRow = piece.color === Color.WHITE ? fromRow - 1 : fromRow + 1;
                this.enPassantTarget = { row: enPassantRow, col: fromCol };
            } else {
                this.enPassantTarget = null;
            }

            if (piece.type === PieceType.PAWN || capturedPiece) {
                this.halfMoveClock = 0;
            } else {
                this.halfMoveClock++;
            }

            if (piece.color === Color.BLACK) {
                this.fullMoveNumber++;
            }
        }
    }

    makeTimeTravelMove(move, isSimulation = false) {
        const { fromRow, fromCol, toRow, toCol, piece, targetTime } = move;
        
        if (!this.isPresentBoard() || !this.linkedBoard) {
            return false;
        }

        const pastBoard = this.linkedBoard;
        
        const movingPiece = this.getPiece(fromRow, fromCol);
        if (!movingPiece) {
            return false;
        }

        const targetInPast = pastBoard.getPiece(toRow, toCol);
        if (targetInPast) {
            return false;
        }

        const spectatorPiece = movingPiece.clone();
        spectatorPiece.markAsSpectator();
        spectatorPiece.isFromTimeTravel = true;

        this.setPiece(fromRow, fromCol, null);
        pastBoard.setPiece(toRow, toCol, spectatorPiece);

        if (!isSimulation) {
            this.timeTravelMoves.push({
                move: move,
                piece: movingPiece,
                targetPosition: { row: toRow, col: toCol }
            });
        }

        return true;
    }

    propagateCaptureToPresent(capturedPiece) {
        if (!this.linkedBoard || !this.isPastBoard()) {
            return;
        }

        const presentBoard = this.linkedBoard;

        if (capturedPiece.isSpectator()) {
            capturedPiece.markAsBanished();
            return;
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const presentPiece = presentBoard.getPiece(row, col);
                if (presentPiece && 
                    presentPiece.type === capturedPiece.type && 
                    presentPiece.color === capturedPiece.color &&
                    !presentPiece.isSpectator() &&
                    !presentPiece.isFromTimeTravel) {
                    presentBoard.setPiece(row, col, null);
                    return;
                }
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

// 游戏历史记录
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

// 积分配置
const ScoreConfig = {
    PAST_CHECKMATE: 2.0,
    PAST_STALEMATE: 1.0,
    PRESENT_CHECKMATE: 1.5,
    PRESENT_STALEMATE: 1.0
};

// 时间线管理器
class TimelineManager {
    constructor() {
        this.timelineType = TimelineType.SINGLE;
        this.presentBoard = new Board(BoardTime.PRESENT);
        this.pastBoard = null;
        this.activeBoard = this.presentBoard;
        this.scores = {
            player: 0,
            ai: 0
        };
        this.banishedPieces = [];
    }

    isSplit() {
        return this.timelineType === TimelineType.SPLIT;
    }

    splitTimeline() {
        if (this.isSplit()) {
            return false;
        }

        this.pastBoard = this.presentBoard.clone();
        this.pastBoard.setBoardTime(BoardTime.PAST);
        
        this.presentBoard.setLinkedBoard(this.pastBoard);
        this.pastBoard.setLinkedBoard(this.presentBoard);

        this.timelineType = TimelineType.SPLIT;
        this.activeBoard = this.pastBoard;

        return true;
    }

    mergeTimeline() {
        if (!this.isSplit()) {
            return false;
        }

        this.presentBoard.setLinkedBoard(null);
        this.pastBoard = null;
        this.timelineType = TimelineType.SINGLE;
        this.activeBoard = this.presentBoard;

        return true;
    }

    getActiveBoard() {
        return this.activeBoard;
    }

    setActiveBoard(boardTime) {
        if (boardTime === BoardTime.PAST && this.pastBoard) {
            this.activeBoard = this.pastBoard;
            return true;
        } else if (boardTime === BoardTime.PRESENT) {
            this.activeBoard = this.presentBoard;
            return true;
        }
        return false;
    }

    getPastBoard() {
        return this.pastBoard;
    }

    getPresentBoard() {
        return this.presentBoard;
    }

    canTimeTravel() {
        return !this.isSplit();
    }

    performTimeTravel(fromRow, fromCol, toRow, toCol) {
        if (!this.canTimeTravel()) {
            return false;
        }

        const piece = this.presentBoard.getPiece(fromRow, fromCol);
        if (!piece || piece.isSpectator() || piece.isBanished()) {
            return false;
        }

        const targetPiece = this.presentBoard.getPiece(toRow, toCol);
        if (targetPiece) {
            return false;
        }

        this.splitTimeline();

        const timeMove = new TimeTravelMove(
            fromRow, fromCol, toRow, toCol, piece, BoardTime.PAST
        );

        return this.presentBoard.makeTimeTravelMove(timeMove, false);
    }

    calculateEndGameScores() {
        const scores = { player: 0, ai: 0 };

        if (this.isSplit()) {
            const pastPlayerCM = this.pastBoard.isCheckmate(Color.WHITE);
            const pastPlayerSM = this.pastBoard.isStalemate(Color.WHITE);
            const pastAICM = this.pastBoard.isCheckmate(Color.BLACK);
            const pastAISM = this.pastBoard.isStalemate(Color.BLACK);

            if (pastPlayerCM) {
                scores.ai += ScoreConfig.PAST_CHECKMATE;
            }
            if (pastPlayerSM) {
                scores.player += ScoreConfig.PAST_STALEMATE * 0.5;
                scores.ai += ScoreConfig.PAST_STALEMATE * 0.5;
            }
            if (pastAICM) {
                scores.player += ScoreConfig.PAST_CHECKMATE;
            }
            if (pastAISM) {
                scores.player += ScoreConfig.PAST_STALEMATE * 0.5;
                scores.ai += ScoreConfig.PAST_STALEMATE * 0.5;
            }
        }

        const presentPlayerCM = this.presentBoard.isCheckmate(Color.WHITE);
        const presentPlayerSM = this.presentBoard.isStalemate(Color.WHITE);
        const presentAICM = this.presentBoard.isCheckmate(Color.BLACK);
        const presentAISM = this.presentBoard.isStalemate(Color.BLACK);

        if (presentPlayerCM) {
            scores.ai += ScoreConfig.PRESENT_CHECKMATE;
        }
        if (presentPlayerSM) {
            scores.player += ScoreConfig.PRESENT_STALEMATE * 0.5;
            scores.ai += ScoreConfig.PRESENT_STALEMATE * 0.5;
        }
        if (presentAICM) {
            scores.player += ScoreConfig.PRESENT_CHECKMATE;
        }
        if (presentAISM) {
            scores.player += ScoreConfig.PRESENT_STALEMATE * 0.5;
            scores.ai += ScoreConfig.PRESENT_STALEMATE * 0.5;
        }

        this.scores = scores;
        return scores;
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

    addBanishedPiece(piece) {
        this.banishedPieces.push(piece);
    }

    getBanishedPieces() {
        return this.banishedPieces;
    }

    reset() {
        this.timelineType = TimelineType.SINGLE;
        this.presentBoard = new Board(BoardTime.PRESENT);
        this.pastBoard = null;
        this.activeBoard = this.presentBoard;
        this.scores = { player: 0, ai: 0 };
        this.banishedPieces = [];
    }
}

// 导出到全局
window.ChessTime = {
    PieceType,
    Color,
    PieceSymbols,
    PieceStatus,
    TimelineType,
    BoardTime,
    MoveType,
    ScoreConfig,
    Piece,
    Move,
    TimeTravelMove,
    Board,
    GameHistory,
    TimelineManager
};

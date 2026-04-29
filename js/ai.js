(function() {
    /**
     * ChessTime - AI对手逻辑
     * 实现简单、中等、困难、大师四个难度的AI
     */

    const { PieceType, Color, Board, Move, PieceStatus, BoardTime, MoveType, TimelineType, TimelineManager } = window.ChessTime;

    // 棋子价值
    const PieceValue = {
        [PieceType.PAWN]: 100,
        [PieceType.KNIGHT]: 320,
        [PieceType.BISHOP]: 330,
        [PieceType.ROOK]: 500,
        [PieceType.QUEEN]: 900,
        [PieceType.KING]: 20000
    };

    // 位置评估表
    const PositionTable = {
        [PieceType.PAWN]: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5, 5, 10, 25, 25, 10, 5, 5],
            [0, 0, 0, 20, 20, 0, 0, 0],
            [5, -5, -10, 0, 0, -10, -5, 5],
            [5, 10, 10, -20, -20, 10, 10, 5],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ],
        [PieceType.KNIGHT]: [
            [-50, -40, -30, -30, -30, -30, -40, -50],
            [-40, -20, 0, 0, 0, 0, -20, -40],
            [-30, 0, 10, 15, 15, 10, 0, -30],
            [-30, 5, 15, 20, 20, 15, 5, -30],
            [-30, 0, 15, 20, 20, 15, 0, -30],
            [-30, 5, 10, 15, 15, 10, 5, -30],
            [-40, -20, 0, 5, 5, 0, -20, -40],
            [-50, -40, -30, -30, -30, -30, -40, -50]
        ],
        [PieceType.BISHOP]: [
            [-20, -10, -10, -10, -10, -10, -10, -20],
            [-10, 0, 0, 0, 0, 0, 0, -10],
            [-10, 0, 5, 10, 10, 5, 0, -10],
            [-10, 5, 5, 10, 10, 5, 5, -10],
            [-10, 0, 10, 10, 10, 10, 0, -10],
            [-10, 10, 10, 10, 10, 10, 10, -10],
            [-10, 5, 0, 0, 0, 0, 5, -10],
            [-20, -10, -10, -10, -10, -10, -10, -20]
        ],
        [PieceType.ROOK]: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [5, 10, 10, 10, 10, 10, 10, 5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [0, 0, 0, 5, 5, 0, 0, 0]
        ],
        [PieceType.QUEEN]: [
            [-20, -10, -10, -5, -5, -10, -10, -20],
            [-10, 0, 0, 0, 0, 0, 0, -10],
            [-10, 0, 5, 5, 5, 5, 0, -10],
            [-5, 0, 5, 5, 5, 5, 0, -5],
            [0, 0, 5, 5, 5, 5, 0, -5],
            [-10, 5, 5, 5, 5, 5, 0, -10],
            [-10, 0, 5, 0, 0, 0, 0, -10],
            [-20, -10, -10, -5, -5, -10, -10, -20]
        ],
        [PieceType.KING]: [
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-20, -30, -30, -40, -40, -30, -30, -20],
            [-10, -20, -20, -20, -20, -20, -20, -10],
            [20, 20, 0, 0, 0, 0, 20, 20],
            [20, 30, 10, 0, 0, 10, 30, 20]
        ]
    };

    // AI难度配置
    const DifficultyConfig = {
        easy: {
            depth: 2,
            randomness: 0.4,
            useQuiescence: false,
            quiescenceDepth: 0,
            timeTravelChance: 0.1,
            timeTravelDepth: 1
        },
        medium: {
            depth: 3,
            randomness: 0.2,
            useQuiescence: true,
            quiescenceDepth: 1,
            timeTravelChance: 0.3,
            timeTravelDepth: 2
        },
        hard: {
            depth: 4,
            randomness: 0.05,
            useQuiescence: true,
            quiescenceDepth: 3,
            timeTravelChance: 0.5,
            timeTravelDepth: 3
        },
        master: {
            depth: 5,
            randomness: 0,
            useQuiescence: true,
            quiescenceDepth: 4,
            timeTravelChance: 0.7,
            timeTravelDepth: 4
        }
    };

    // 时间旅行评估配置
    const TimeTravelConfig = {
        SPECTATOR_BONUS: 50,
        STRATEGIC_POSITION_BONUS: 30,
        THREAT_TO_ENEMY_BONUS: 100,
        DEFENSE_OPPORTUNITY_BONUS: 80,
        PIECE_VALUE_WEIGHT: 2.0,
        POSITION_VALUE_WEIGHT: 1.0,
        THREAT_WEIGHT: 1.5
    };

    class ChessAI {
        constructor(difficulty = 'medium') {
            this.setDifficulty(difficulty);
        }

        setDifficulty(difficulty) {
            if (difficulty === 'hard' || difficulty === 'master') {
                console.warn(`难度 ${difficulty} 已暂时禁用，使用中等难度替代`);
                difficulty = 'medium';
            }
            this.difficulty = difficulty;
            this.config = DifficultyConfig[difficulty];
        }

        getTimeTravelMoves(board, history = null) {
            const timeTravelMoves = [];
            const color = Color.BLACK;

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece && piece.color === color && piece.isNormal()) {
                        const moves = board.getTimeTravelMoves(row, col);
                        for (const move of moves) {
                            if (this.isValidTimeTravelTarget(move.toRow, move.toCol, board, history)) {
                                timeTravelMoves.push({
                                    fromRow: move.fromRow,
                                    fromCol: move.fromCol,
                                    toRow: move.toRow,
                                    toCol: move.toCol,
                                    piece: move.piece,
                                    moveType: MoveType.TIME_TRAVEL
                                });
                            }
                        }
                    }
                }
            }

            return timeTravelMoves;
        }

        isValidTimeTravelTarget(targetRow, targetCol, presentBoard, history) {
            if (presentBoard.getPiece(targetRow, targetCol)) {
                return false;
            }

            if (history && history.boardStates && history.boardStates.length > 0) {
                const historySize = history.boardStates.length;
                
                let targetIndex = -1;
                if (historySize >= 4 && historySize % 2 === 0) {
                    targetIndex = historySize - 3;
                } else if (historySize >= 2) {
                    targetIndex = 1;
                }

                if (targetIndex >= 0 && targetIndex < history.boardStates.length) {
                    const targetBoard = history.boardStates[targetIndex];
                    const targetPiece = targetBoard.getPiece(targetRow, targetCol);
                    if (targetPiece) {
                        return false;
                    }
                }
            }

            return true;
        }

        evaluateTimeTravelMove(timeTravelMove, presentBoard, history = null) {
            const { fromRow, fromCol, toRow, toCol, piece } = timeTravelMove;
            
            let score = 0;

            const pieceValue = PieceValue[piece.type];
            score += pieceValue * TimeTravelConfig.PIECE_VALUE_WEIGHT;

            const positionBonus = this.getPositionBonus(piece, toRow, toCol);
            score += positionBonus * TimeTravelConfig.POSITION_VALUE_WEIGHT;

            score += this.evaluateTimeTravelStrategicValue(toRow, toCol, piece, presentBoard);

            score += this.evaluateTimeTravelThreats(toRow, toCol, piece, presentBoard);

            score += this.evaluateTimeTravelDefense(fromRow, fromCol, toRow, toCol, piece, presentBoard);

            if (this.isInDanger(fromRow, fromCol, piece, presentBoard)) {
                score += 150;
            }

            const centerDistance = Math.abs(toRow - 3.5) + Math.abs(toCol - 3.5);
            score += (8 - centerDistance) * 5;

            return score;
        }

        isInDanger(row, col, piece, board) {
            const opponentColor = piece.color === Color.WHITE ? Color.BLACK : Color.WHITE;
            
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const attacker = board.getPiece(r, c);
                    if (attacker && attacker.color === opponentColor && attacker.isNormal()) {
                        const moves = board.getPieceMoves(r, c, true);
                        for (const move of moves) {
                            if (move.toRow === row && move.toCol === col) {
                                const attackerValue = PieceValue[attacker.type];
                                const defenderValue = PieceValue[piece.type];
                                
                                if (attackerValue < defenderValue || defenderValue > PieceValue[PieceType.PAWN] * 2) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            
            return false;
        }

        evaluateTimeTravelStrategicValue(targetRow, targetCol, piece, board) {
            let score = 0;

            const opponentColor = piece.color === Color.WHITE ? Color.BLACK : Color.WHITE;
            
            const opponentKingPos = this.findKingPosition(board, opponentColor);
            if (opponentKingPos) {
                const distanceToKing = Math.abs(targetRow - opponentKingPos.row) + Math.abs(targetCol - opponentKingPos.col);
                score += (14 - distanceToKing) * 3;
            }

            const centerBonus = this.evaluateCenterControlForPosition(targetRow, targetCol);
            score += centerBonus * 2;

            const isBackRank = (piece.color === Color.WHITE && targetRow <= 1) || 
                               (piece.color === Color.BLACK && targetRow >= 6);
            if (isBackRank) {
                score += 20;
            }

            return score;
        }

        evaluateTimeTravelThreats(targetRow, targetCol, piece, board) {
            let score = 0;

            const tempBoard = board.clone();
            const tempPiece = new Piece(piece.type, piece.color);
            tempBoard.setPiece(targetRow, targetCol, tempPiece);

            const moves = tempBoard.getPieceMoves(targetRow, targetCol);
            for (const move of moves) {
                const target = board.getPiece(move.toRow, move.toCol);
                if (target && target.color !== piece.color && target.isNormal()) {
                    const value = PieceValue[target.type];
                    score += value * 0.5;

                    if (target.type === PieceType.KING) {
                        score += 200;
                    }
                }
            }

            return score;
        }

        evaluateTimeTravelDefense(fromRow, fromCol, toRow, toCol, piece, board) {
            let score = 0;

            const tempBoard = board.clone();
            tempBoard.setPiece(fromRow, fromCol, null);
            const tempPiece = new Piece(piece.type, piece.color);
            tempPiece.setStatus(PieceStatus.SPECTATOR);
            tempBoard.setPiece(toRow, toCol, tempPiece);

            if (tempBoard.isInCheck(piece.color)) {
                score -= 1000;
            }

            const allyPieces = this.getAllyPieces(board, piece.color);
            for (const ally of allyPieces) {
                if (ally.row === fromRow && ally.col === fromCol) continue;
                
                if (this.isPieceDefended(ally.row, ally.col, ally.piece, tempBoard)) {
                    score += 10;
                }
            }

            return score;
        }

        getAllyPieces(board, color) {
            const pieces = [];
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece && piece.color === color && piece.isNormal()) {
                        pieces.push({ row, col, piece });
                    }
                }
            }
            return pieces;
        }

        isPieceDefended(row, col, piece, board) {
            const allyColor = piece.color;
            
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const defender = board.getPiece(r, c);
                    if (defender && defender.color === allyColor && 
                        (defender.isNormal() || defender.isSpectator())) {
                        if (r === row && c === col) continue;
                        
                        const moves = board.getPieceMoves(r, c, true);
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

        findKingPosition(board, color) {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece && piece.type === PieceType.KING && piece.color === color) {
                        return { row, col };
                    }
                }
            }
            return null;
        }

        evaluateCenterControlForPosition(row, col) {
            const centerSquares = [
                { row: 3, col: 3 }, { row: 3, col: 4 },
                { row: 4, col: 3 }, { row: 4, col: 4 }
            ];
            
            const extendedCenter = [
                { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
                { row: 3, col: 2 }, { row: 3, col: 5 },
                { row: 4, col: 2 }, { row: 4, col: 5 },
                { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }
            ];

            for (const square of centerSquares) {
                if (square.row === row && square.col === col) {
                    return 15;
                }
            }

            for (const square of extendedCenter) {
                if (square.row === row && square.col === col) {
                    return 8;
                }
            }

            return 0;
        }

        evaluateSplitTimeline(timelineManager, color) {
            let score = 0;
            
            const pastBoard = timelineManager.getPastBoard();
            const presentBoard = timelineManager.getPresentBoard();

            score += this.evaluateBoardForColor(pastBoard, color);
            score += this.evaluateBoardForColor(presentBoard, color);

            score += this.evaluateSpectatorImpact(timelineManager, color);
            score += this.evaluateTimelineSynergy(timelineManager, color);

            const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
            score -= this.evaluateBoardForColor(pastBoard, opponentColor);
            score -= this.evaluateBoardForColor(presentBoard, opponentColor);
            score -= this.evaluateSpectatorImpact(timelineManager, opponentColor);
            score -= this.evaluateTimelineSynergy(timelineManager, opponentColor);

            return score;
        }

        evaluateBoardForColor(board, color) {
            let score = 0;

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece && piece.color === color) {
                        if (piece.isNormal()) {
                            score += PieceValue[piece.type];
                            score += this.getPositionBonus(piece, row, col);
                        } else if (piece.isSpectator()) {
                            score += PieceValue[piece.type] * 0.5;
                        }
                    }
                }
            }

            if (board.isCheckmate(color === Color.WHITE ? Color.BLACK : Color.WHITE)) {
                score += 10000;
            }

            return score;
        }

        evaluateSpectatorImpact(timelineManager, color) {
            let score = 0;
            const pastBoard = timelineManager.getPastBoard();

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = pastBoard.getPiece(row, col);
                    if (piece && piece.color === color && piece.isSpectator()) {
                        score += TimeTravelConfig.SPECTATOR_BONUS;
                        
                        const moves = pastBoard.getPieceMoves(row, col);
                        for (const move of moves) {
                            const target = pastBoard.getPiece(move.toRow, move.toCol);
                            if (target && target.color !== color && target.isNormal()) {
                                score += PieceValue[target.type] * 0.25;
                            }
                        }
                    }
                }
            }

            return score;
        }

        evaluateTimelineSynergy(timelineManager, color) {
            let score = 0;
            const pastBoard = timelineManager.getPastBoard();
            const presentBoard = timelineManager.getPresentBoard();

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const presentPiece = presentBoard.getPiece(row, col);
                    if (presentPiece && presentPiece.color === color && presentPiece.isNormal() && presentPiece.originalId) {
                        const pastPiece = timelineManager.findPieceByOriginalId(pastBoard, presentPiece.originalId);
                        if (pastPiece && pastPiece.piece.isNormal()) {
                            score += 50;
                        }
                    }
                }
            }

            const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
            const presentKing = this.findKingPosition(presentBoard, opponentColor);
            const pastKing = this.findKingPosition(pastBoard, opponentColor);
            
            if (presentKing && pastKing) {
                const presentThreat = this.evaluateKingThreat(presentBoard, presentKing, color);
                const pastThreat = this.evaluateKingThreat(pastBoard, pastKing, color);
                score += (presentThreat + pastThreat) * 2;
            }

            return score;
        }

        evaluateKingThreat(board, kingPos, attackerColor) {
            let threat = 0;
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece && piece.color === attackerColor && piece.isNormal()) {
                        const moves = board.getPieceMoves(row, col, true);
                        for (const move of moves) {
                            if (move.toRow === kingPos.row && move.toCol === kingPos.col) {
                                threat += PieceValue[piece.type] * 0.1;
                            }
                        }
                    }
                }
            }

            return threat;
        }

        evaluateBoard(board) {
            let score = 0;

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece) {
                        const pieceValue = PieceValue[piece.type];
                        const positionBonus = this.getPositionBonus(piece, row, col);
                        
                        if (piece.color === Color.BLACK) {
                            score += pieceValue + positionBonus;
                        } else {
                            score -= pieceValue + positionBonus;
                        }
                    }
                }
            }

            score += this.evaluateCheckmate(board);
            score += this.evaluateCenterControl(board);
            score += this.evaluateMobility(board);
            score += this.evaluatePawnStructure(board);

            return score;
        }

        getPositionBonus(piece, row, col) {
            const table = PositionTable[piece.type];
            if (!table) return 0;
            
            if (piece.color === Color.WHITE) {
                return table[row][col];
            } else {
                return table[7 - row][col];
            }
        }

        evaluateCheckmate(board) {
            if (board.isCheckmate(Color.WHITE)) return 10000;
            if (board.isCheckmate(Color.BLACK)) return -10000;
            if (board.isStalemate(Color.WHITE) || board.isStalemate(Color.BLACK)) return 0;
            return 0;
        }

        evaluateCenterControl(board) {
            let score = 0;
            const centerSquares = [
                { row: 3, col: 3 }, { row: 3, col: 4 },
                { row: 4, col: 3 }, { row: 4, col: 4 }
            ];
            const extendedCenter = [
                { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
                { row: 3, col: 2 }, { row: 3, col: 5 },
                { row: 4, col: 2 }, { row: 4, col: 5 },
                { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }
            ];

            for (const { row, col } of centerSquares) {
                const piece = board.getPiece(row, col);
                if (piece) {
                    score += piece.color === Color.BLACK ? 10 : -10;
                }
            }

            for (const { row, col } of extendedCenter) {
                const piece = board.getPiece(row, col);
                if (piece) {
                    score += piece.color === Color.BLACK ? 5 : -5;
                }
            }

            return score;
        }

        evaluateMobility(board) {
            return 0;
        }

        evaluatePawnStructure(board) {
            let score = 0;
            
            for (let col = 0; col < 8; col++) {
                let blackPawns = 0;
                let whitePawns = 0;
                
                for (let row = 0; row < 8; row++) {
                    const piece = board.getPiece(row, col);
                    if (piece && piece.type === PieceType.PAWN) {
                        if (piece.color === Color.BLACK) {
                            blackPawns++;
                        } else {
                            whitePawns++;
                        }
                    }
                }
                
                if (blackPawns > 1) score -= 10 * (blackPawns - 1);
                if (whitePawns > 1) score += 10 * (whitePawns - 1);
            }
            
            return score;
        }

        minimax(board, depth, alpha, beta, maximizingPlayer) {
            if (depth === 0 || board.isGameOver()) {
                if (this.config.useQuiescence) {
                    return this.quiescence(board, alpha, beta, maximizingPlayer);
                }
                return this.evaluateBoard(board);
            }

            const color = maximizingPlayer ? Color.BLACK : Color.WHITE;
            const moves = board.getAllLegalMoves(color);

            if (moves.length === 0) {
                if (board.isInCheck(color)) {
                    return maximizingPlayer ? -100000 : 100000;
                }
                return 0;
            }

            this.orderMoves(board, moves);

            if (maximizingPlayer) {
                let maxEval = -Infinity;
                for (const move of moves) {
                    const boardClone = board.clone();
                    boardClone.makeMove(move, true);
                    const evalScore = this.minimax(boardClone, depth - 1, alpha, beta, false);
                    maxEval = Math.max(maxEval, evalScore);
                    alpha = Math.max(alpha, evalScore);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const move of moves) {
                    const boardClone = board.clone();
                    boardClone.makeMove(move, true);
                    const evalScore = this.minimax(boardClone, depth - 1, alpha, beta, true);
                    minEval = Math.min(minEval, evalScore);
                    beta = Math.min(beta, evalScore);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        quiescence(board, alpha, beta, maximizingPlayer, depthLeft) {
            const maxQuiescenceDepth = this.config.quiescenceDepth || 2;
            
            if (depthLeft === undefined) {
                depthLeft = maxQuiescenceDepth;
            }
            
            const standPat = this.evaluateBoard(board);
            
            if (maximizingPlayer) {
                if (standPat >= beta) return beta;
                if (alpha < standPat) alpha = standPat;
            } else {
                if (standPat <= alpha) return alpha;
                if (beta > standPat) beta = standPat;
            }

            if (depthLeft <= 0) {
                return standPat;
            }

            const color = maximizingPlayer ? Color.BLACK : Color.WHITE;
            const moves = board.getAllLegalMoves(color);
            const captures = moves.filter(m => m.capturedPiece);
            
            if (captures.length === 0) {
                return standPat;
            }
            
            this.orderMoves(board, captures);

            if (maximizingPlayer) {
                let maxEval = -Infinity;
                for (const move of captures) {
                    const boardClone = board.clone();
                    boardClone.makeMove(move, true);
                    const score = this.quiescence(boardClone, alpha, beta, false, depthLeft - 1);
                    maxEval = Math.max(maxEval, score);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const move of captures) {
                    const boardClone = board.clone();
                    boardClone.makeMove(move, true);
                    const score = this.quiescence(boardClone, alpha, beta, true, depthLeft - 1);
                    minEval = Math.min(minEval, score);
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        orderMoves(board, moves) {
            moves.sort((a, b) => {
                if (a.capturedPiece && !b.capturedPiece) return -1;
                if (!a.capturedPiece && b.capturedPiece) return 1;
                if (a.capturedPiece && b.capturedPiece) {
                    const aGain = PieceValue[a.capturedPiece.type] - PieceValue[a.piece.type];
                    const bGain = PieceValue[b.capturedPiece.type] - PieceValue[b.piece.type];
                    return bGain - aGain;
                }
                
                const aPosValue = this.getPositionBonus(a.piece, a.toRow, a.toCol);
                const bPosValue = this.getPositionBonus(b.piece, b.toRow, b.toCol);
                return bPosValue - aPosValue;
            });
        }

        selectBestMove(board, color = Color.BLACK) {
            const result = this.selectBestMoveWithOptions(board, color, null, false);
            if (result && result.move) {
                return result.move;
            }
            return null;
        }

        selectBestMoveWithOptions(board, color = Color.BLACK, history = null, canTimeTravel = true) {
            const normalMoves = board.getAllLegalMoves(color);
            
            if (normalMoves.length === 0) return null;

            let bestMove = null;
            let bestScore = -Infinity;
            let bestMoveType = 'normal';
            const scores = [];

            this.orderMoves(board, normalMoves);

            for (const move of normalMoves) {
                const boardClone = board.clone();
                boardClone.makeMove(move, true);
                const score = this.minimax(
                    boardClone, 
                    this.config.depth - 1, 
                    -Infinity, 
                    Infinity, 
                    false
                );
                
                scores.push({ move, score, type: 'normal' });
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                    bestMoveType = 'normal';
                }
            }

            if (canTimeTravel && Math.random() < this.config.timeTravelChance) {
                const timeTravelMoves = this.getTimeTravelMoves(board, history);
                
                if (timeTravelMoves.length > 0) {
                    for (const timeTravelMove of timeTravelMoves) {
                        const timeTravelScore = this.evaluateTimeTravelMove(timeTravelMove, board, history);
                        
                        const adjustedScore = timeTravelScore + this.config.depth * 20;
                        
                        scores.push({ 
                            move: timeTravelMove, 
                            score: adjustedScore, 
                            type: 'time_travel' 
                        });
                        
                        if (adjustedScore > bestScore) {
                            bestScore = adjustedScore;
                            bestMove = timeTravelMove;
                            bestMoveType = 'time_travel';
                        }
                    }

                    console.log(`AI考虑了 ${timeTravelMoves.length} 个时间旅行移动`);
                    if (bestMoveType === 'time_travel') {
                        console.log(`AI选择时间旅行移动: 分数 ${bestScore}`);
                    }
                }
            }

            if (this.config.randomness > 0 && scores.length > 0) {
                scores.sort((a, b) => b.score - a.score);
                const topMoves = scores.slice(0, Math.min(3, scores.length));
                
                if (topMoves.length > 0 && Math.random() < this.config.randomness * 0.5) {
                    const randomIndex = Math.floor(Math.random() * topMoves.length);
                    const selected = topMoves[randomIndex];
                    if (selected.type === 'time_travel') {
                        console.log('AI随机选择了时间旅行移动');
                    }
                    return { move: selected.move, type: selected.type };
                }
            }

            return { move: bestMove, type: bestMoveType };
        }

        getDifficultyName() {
            const names = {
                easy: '简单',
                medium: '中等',
                hard: '困难',
                master: '大师'
            };
            return names[this.difficulty] || '中等';
        }
    }

    window.ChessAI = ChessAI;
})();

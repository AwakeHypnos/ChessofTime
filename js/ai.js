(function() {
    /**
     * ChessTime - AI对手逻辑
     * 实现简单、中等、困难、大师四个难度的AI
     */

    const { PieceType, Color, Board, Move } = window.ChessTime;

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
            quiescenceDepth: 0
        },
        medium: {
            depth: 3,
            randomness: 0.2,
            useQuiescence: true,
            quiescenceDepth: 1
        },
        hard: {
            depth: 4,
            randomness: 0.05,
            useQuiescence: true,
            quiescenceDepth: 3
        },
        master: {
            depth: 5,
            randomness: 0,
            useQuiescence: true,
            quiescenceDepth: 4
        }
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
            const moves = board.getAllLegalMoves(color);
            
            if (moves.length === 0) return null;

            if (this.config.randomness > 0 && Math.random() < this.config.randomness) {
                const randomIndex = Math.floor(Math.random() * moves.length);
                return moves[randomIndex];
            }

            let bestMove = null;
            let bestScore = -Infinity;
            const scores = [];

            this.orderMoves(board, moves);

            for (const move of moves) {
                const boardClone = board.clone();
                boardClone.makeMove(move, true);
                const score = this.minimax(
                    boardClone, 
                    this.config.depth - 1, 
                    -Infinity, 
                    Infinity, 
                    false
                );
                
                scores.push({ move, score });
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            if (this.config.randomness > 0) {
                scores.sort((a, b) => b.score - a.score);
                const topMoves = scores.slice(0, Math.min(3, scores.length));
                if (topMoves.length > 0 && Math.random() < this.config.randomness * 0.5) {
                    const randomIndex = Math.floor(Math.random() * topMoves.length);
                    return topMoves[randomIndex].move;
                }
            }

            return bestMove;
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

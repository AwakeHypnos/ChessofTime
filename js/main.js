(function() {
    /**
     * ChessTime - 主程序入口
     * 整合所有模块，管理游戏状态 - 支持时间旅行规则
     */

    const { 
        PieceType, 
        Color, 
        Board, 
        Move, 
        GameHistory, 
        Piece,
        PieceStatus,
        TimelineType,
        BoardTime,
        MoveType,
        ScoreConfig,
        TimelineManager
    } = window.ChessTime;
    const ChessAI = window.ChessAI;
    const GameUI = window.GameUI;

    class ChessTimeGame {
        constructor() {
            this.timelineManager = new TimelineManager();
            this.board = this.timelineManager.getPresentBoard();
            this.ai = new ChessAI('medium');
            this.history = new GameHistory();
            this.currentTurn = Color.WHITE;
            this.gameOver = false;
            this.capturedPieces = {
                player: [],
                opponent: []
            };
            
            this.preTimelineState = null;
            
            this.turnOrder = [];
            this.currentTurnIndex = 0;
            
            this.ui = new GameUI(this);
            this.ui.updateDifficultySelection('medium');
            this.init();
        }

        init() {
            console.log('ChessTime - 穿越时间的象棋');
            console.log('赛博朋克风格国际象棋游戏');
            console.log('支持时间旅行规则');
        }

        setDifficulty(difficulty) {
            this.ai.setDifficulty(difficulty);
            console.log(`难度已设置为: ${this.ai.getDifficultyName()}`);
        }

        startGame() {
            this.timelineManager.reset();
            this.board = this.timelineManager.getPresentBoard();
            this.history = new GameHistory();
            this.currentTurn = Color.WHITE;
            this.gameOver = false;
            this.capturedPieces = {
                player: [],
                opponent: []
            };
            this.preTimelineState = null;
            this.turnOrder = [];
            this.currentTurnIndex = 0;
            
            this.ui.showScreen('gameScreen');
            this.ui.resetGameUI();
            console.log('游戏开始！玩家执白先行。');
        }

        canTimeTravel() {
            return this.timelineManager.canTimeTravel();
        }

        performTimeTravel(fromRow, fromCol, toRow, toCol) {
            if (!this.canTimeTravel()) {
                return false;
            }

            this.savePreTimelineState();

            const historySize = this.history.size();
            let targetBoard = null;
            
            if (historySize >= 4 && historySize % 2 === 0) {
                const targetIndex = historySize - 3;
                if (targetIndex >= 0 && targetIndex < this.history.boardStates.length) {
                    targetBoard = this.history.boardStates[targetIndex];
                    console.log(`时间旅行目标状态：索引 ${targetIndex} (AI上上次行动后)`);
                }
            } else if (historySize >= 2) {
                const targetIndex = 1;
                if (targetIndex < this.history.boardStates.length) {
                    targetBoard = this.history.boardStates[targetIndex];
                    console.log(`时间旅行目标状态：索引 ${targetIndex} (AI第1次行动后)`);
                }
            }

            let success;
            
            if (targetBoard) {
                const targetPiece = targetBoard.getPiece(toRow, toCol);
                if (targetPiece) {
                    console.log('时间旅行失败：目标位置在历史状态中已有棋子');
                    alert('时间旅行失败：目标位置在该历史时间点已有棋子！');
                    return false;
                }
                
                success = this.timelineManager.performTimeTravel(fromRow, fromCol, toRow, toCol, targetBoard);
            } else {
                console.log('时间旅行：历史记录不足，使用当前状态克隆');
                success = this.timelineManager.performTimeTravel(fromRow, fromCol, toRow, toCol);
            }
            
            if (success) {
                this.board = this.timelineManager.getPresentBoard();
                
                const piece = this.timelineManager.getPastBoard().getPiece(toRow, toCol);
                const timeMove = new Move(fromRow, fromCol, toRow, toCol, piece, null);
                timeMove.moveType = MoveType.TIME_TRAVEL;
                this.history.addMove(timeMove, this.timelineManager.getPresentBoard());
                
                this.setupTurnOrder(Color.WHITE);
                
                console.log('时间旅行成功！时间线已分裂。');
                console.log('回合顺序：AI往昔 -> AI现在 -> 玩家往昔 -> 玩家现在');
                
                if (this.currentTurn === Color.BLACK && !this.gameOver) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }

            return success;
        }

        savePreTimelineState() {
            this.preTimelineState = {
                board: this.timelineManager.getPresentBoard().clone(),
                historyMoves: [...this.history.moves],
                historyBoards: [...this.history.boardStates],
                capturedPieces: {
                    player: [...this.capturedPieces.player],
                    opponent: [...this.capturedPieces.opponent]
                },
                currentTurn: this.currentTurn
            };
        }

        setupTurnOrder(lastActor) {
            const nextActor = lastActor === Color.WHITE ? Color.BLACK : Color.WHITE;
            
            this.turnOrder = [
                { color: nextActor, boardTime: BoardTime.PAST },
                { color: nextActor, boardTime: BoardTime.PRESENT },
                { color: lastActor, boardTime: BoardTime.PAST },
                { color: lastActor, boardTime: BoardTime.PRESENT }
            ];
            
            this.currentTurnIndex = 0;
            
            const currentStep = this.turnOrder[this.currentTurnIndex];
            this.currentTurn = currentStep.color;
            this.timelineManager.setActiveBoard(currentStep.boardTime);
            
            this.updateTimelineDisplay();
        }

        advanceTurn() {
            if (!this.timelineManager.isSplit()) {
                return;
            }
            
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
            
            const currentStep = this.turnOrder[this.currentTurnIndex];
            this.currentTurn = currentStep.color;
            this.timelineManager.setActiveBoard(currentStep.boardTime);
            
            console.log(`回合切换: ${this.currentTurn === Color.WHITE ? '玩家' : 'AI'} - ${currentStep.boardTime === BoardTime.PAST ? '往昔' : '现在'}`);
            
            this.updateTimelineDisplay();
        }

        makeMove(move, boardTime = BoardTime.PRESENT) {
            if (this.gameOver) return false;

            const timelineManager = this.timelineManager;
            let targetBoard;

            if (timelineManager.isSplit()) {
                targetBoard = timelineManager.getActiveBoard();
                if (targetBoard.getBoardTime() !== boardTime) {
                    return false;
                }
            } else {
                targetBoard = timelineManager.getPresentBoard();
            }

            if (move.capturedPiece) {
                if (this.currentTurn === Color.WHITE) {
                    this.capturedPieces.player.push(move.capturedPiece);
                } else {
                    this.capturedPieces.opponent.push(move.capturedPiece);
                }
            }

            this.history.addMove(move, targetBoard);
            targetBoard.makeMove(move);

            this.ui.updateCapturedPieces();
            this.checkGameState();

            if (!this.gameOver) {
                if (timelineManager.isSplit()) {
                    this.advanceTurn();
                    
                    if (this.currentTurn === Color.BLACK) {
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                } else {
                    this.switchTurn();
                    if (this.currentTurn === Color.BLACK) {
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                }
            }

            return true;
        }

        makeAIMove() {
            if (this.gameOver || this.currentTurn !== Color.BLACK) return;

            const timelineManager = this.timelineManager;
            let targetBoard;

            if (timelineManager.isSplit()) {
                targetBoard = timelineManager.getActiveBoard();
            } else {
                targetBoard = timelineManager.getPresentBoard();
            }

            if (this.isBoardGameOver(targetBoard)) {
                console.log('当前棋盘已结束，跳过AI移动');
                this.advanceTurn();
                if (this.currentTurn === Color.BLACK && !this.gameOver) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
                return;
            }

            const aiMove = this.ai.selectBestMove(targetBoard, Color.BLACK);
            
            if (aiMove) {
                this.ui.lastMove = { ...aiMove, boardTime: targetBoard.getBoardTime() };
                this.makeMove(aiMove, targetBoard.getBoardTime());
                this.ui.renderAllBoards();
            } else {
                console.log('AI无合法移动，跳过当前回合');
                if (timelineManager.isSplit()) {
                    this.advanceTurn();
                    if (this.currentTurn === Color.BLACK && !this.gameOver) {
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                }
            }
        }

        switchTurn() {
            this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
        }

        isBoardGameOver(board) {
            return board.isGameOver();
        }

        checkGameState() {
            this.ui.updateStatusLights();
            this.ui.updateScores();
            this.ui.updateBanishedPieces();
            this.ui.updateCheckIndicator();

            const timelineManager = this.timelineManager;
            
            let isGameOver = false;
            
            if (timelineManager.isSplit()) {
                const pastOver = this.isBoardGameOver(timelineManager.getPastBoard());
                const presentOver = this.isBoardGameOver(timelineManager.getPresentBoard());
                
                isGameOver = pastOver && presentOver;
            } else {
                isGameOver = this.isBoardGameOver(timelineManager.getPresentBoard());
            }

            if (isGameOver) {
                this.gameOver = true;
                const scores = timelineManager.calculateEndGameScores();
                const winner = timelineManager.getWinnerByScore();
                
                if (winner) {
                    console.log(`游戏结束！${winner === Color.WHITE ? '玩家' : 'AI'}获胜！`);
                    console.log(`积分: 玩家 ${scores.player} - AI ${scores.ai}`);
                } else {
                    console.log('游戏结束！平局！');
                    console.log(`积分: 玩家 ${scores.player} - AI ${scores.ai}`);
                }
                
                this.ui.showGameOver(winner, scores);
            }
        }

        updateTimelineDisplay() {
            this.ui.updateTimelineDisplay();
            this.ui.updateTurnIndicators();
        }

        undoMove() {
            const historySize = this.history.size();
            if (historySize === 0) {
                console.log('没有可悔棋的步骤');
                return false;
            }

            if (this.currentTurn === Color.BLACK) {
                console.log('AI回合不能悔棋');
                return false;
            }

            if (this.timelineManager.isSplit()) {
                return this.undoInSplitTimeline();
            }

            let undoCount = 0;
            
            if (historySize % 2 === 1) {
                undoCount = 1;
            } else {
                undoCount = 2;
            }

            if (historySize < undoCount) {
                undoCount = historySize;
            }

            console.log(`悔棋步数: ${undoCount}, 历史记录数: ${historySize}`);

            let finalBoard = null;
            for (let i = 0; i < undoCount && this.history.size() > 0; i++) {
                const undoResult = this.history.undo();
                if (undoResult) {
                    finalBoard = undoResult.board;
                    
                    if (undoResult.move && undoResult.move.capturedPiece) {
                        const moveIndex = historySize - i;
                        if (moveIndex % 2 === 1) {
                            this.capturedPieces.player.pop();
                        } else {
                            this.capturedPieces.opponent.pop();
                        }
                    }
                }
            }

            if (finalBoard) {
                this.timelineManager.presentBoard = finalBoard.clone();
                this.board = this.timelineManager.presentBoard;
            } else {
                this.timelineManager.reset();
                this.board = this.timelineManager.getPresentBoard();
            }

            this.currentTurn = Color.WHITE;
            this.gameOver = false;

            if (this.history.size() > 0) {
                const moves = this.history.moves;
                this.ui.lastMove = moves[moves.length - 1];
            } else {
                this.ui.lastMove = null;
            }

            this.ui.updateCapturedPieces();
            this.ui.updateStatusLights();
            this.ui.updateCheckIndicator();
            this.ui.selectedSquare = null;
            this.ui.validMoves = [];
            this.ui.renderAllBoards();

            console.log('悔棋成功');
            return true;
        }

        undoInSplitTimeline() {
            const historySize = this.history.size();
            const timelineManager = this.timelineManager;
            
            console.log(`双棋盘悔棋 - currentTurnIndex: ${this.currentTurnIndex}, historySize: ${historySize}`);
            
            if (!this.preTimelineState) {
                console.log('无法找到时间旅行前的状态');
                alert('无法悔棋！');
                return false;
            }

            const currentStep = this.turnOrder[this.currentTurnIndex];
            const isPlayerTurn = currentStep.color === Color.WHITE;
            
            if (!isPlayerTurn) {
                console.log('当前不是玩家回合，无法悔棋');
                return false;
            }

            const lastPlayerMoveInfo = this.findLastPlayerMoveInSplitTimeline();
            
            if (!lastPlayerMoveInfo) {
                console.log('双棋盘状态下没有玩家移动，撤销时间旅行');
                return this.undoTimeTravel();
            }

            console.log(`找到最后一次玩家移动 - 棋盘: ${lastPlayerMoveInfo.boardTime}, 移动次数: ${lastPlayerMoveInfo.moveCount}`);

            if (this.currentTurnIndex === 3) {
                console.log('当前是玩家现在回合，撤销上一次玩家移动（往昔棋盘）');
                return this.undoPlayerMoves(1);
            }

            if (this.currentTurnIndex === 2) {
                if (lastPlayerMoveInfo.moveCount >= 2) {
                    console.log('当前是玩家往昔回合，撤销两次玩家移动');
                    return this.undoPlayerMoves(2);
                } else if (lastPlayerMoveInfo.moveCount === 1) {
                    console.log('当前是玩家往昔回合，只有一次玩家移动，撤销时间旅行');
                    return this.undoTimeTravel();
                } else {
                    console.log('没有玩家移动，撤销时间旅行');
                    return this.undoTimeTravel();
                }
            }

            console.log('无法确定悔棋逻辑，撤销时间旅行');
            return this.undoTimeTravel();
        }

        findLastPlayerMoveInSplitTimeline() {
            const moves = this.history.moves;
            const boardStates = this.history.boardStates;
            let playerMoveCount = 0;
            let lastPlayerBoardTime = null;

            for (let i = moves.length - 1; i >= 0; i--) {
                const move = moves[i];
                
                if (move.moveType === MoveType.TIME_TRAVEL) {
                    break;
                }
                
                if (move.piece && move.piece.color === Color.WHITE) {
                    playerMoveCount++;
                    if (playerMoveCount === 1 && boardStates[i]) {
                        lastPlayerBoardTime = boardStates[i].boardTime;
                    }
                }
            }

            if (playerMoveCount === 0) {
                return null;
            }

            return {
                moveCount: playerMoveCount,
                lastBoardTime: lastPlayerBoardTime
            };
        }

        undoPlayerMoves(count) {
            const timelineManager = this.timelineManager;
            
            let playerMovesUndone = 0;
            let finalPastBoard = null;
            let finalPresentBoard = null;
            let lastUndoneWasPast = false;

            while (this.history.size() > 0 && playerMovesUndone < count) {
                const lastMove = this.history.moves[this.history.moves.length - 1];
                
                if (lastMove.moveType === MoveType.TIME_TRAVEL) {
                    console.log('到达时间旅行点，停止撤销');
                    break;
                }

                const isPlayerMove = lastMove.piece && lastMove.piece.color === Color.WHITE;
                
                const undoResult = this.history.undo();
                if (!undoResult) {
                    break;
                }

                const { move, board } = undoResult;

                if (isPlayerMove) {
                    playerMovesUndone++;
                    lastUndoneWasPast = board.isPastBoard();
                    
                    if (move.capturedPiece) {
                        this.capturedPieces.player.pop();
                    }

                    if (board.isPastBoard()) {
                        finalPastBoard = board;
                        console.log('保存往昔棋盘状态');
                    } else {
                        finalPresentBoard = board;
                        console.log('保存现在棋盘状态');
                    }
                } else {
                    if (move.capturedPiece) {
                        this.capturedPieces.opponent.pop();
                    }
                }
            }

            if (playerMovesUndone === 0) {
                console.log('没有玩家移动可以撤销');
                return this.undoTimeTravel();
            }

            if (finalPastBoard) {
                timelineManager.pastBoard = finalPastBoard.clone();
            }
            if (finalPresentBoard) {
                timelineManager.presentBoard = finalPresentBoard.clone();
                this.board = timelineManager.presentBoard;
            }

            if (count === 1) {
                this.currentTurnIndex = 2;
            } else {
                this.currentTurnIndex = 3;
            }

            const step = this.turnOrder[this.currentTurnIndex];
            this.currentTurn = step.color;
            timelineManager.setActiveBoard(step.boardTime);

            if (this.history.size() > 0) {
                const moves = this.history.moves;
                const lastMove = moves[moves.length - 1];
                if (lastMove.moveType !== MoveType.TIME_TRAVEL) {
                    this.ui.lastMove = lastMove;
                } else {
                    this.ui.lastMove = null;
                }
            } else {
                this.ui.lastMove = null;
            }

            this.gameOver = false;
            this.ui.updateCapturedPieces();
            this.ui.updateStatusLights();
            this.ui.updateCheckIndicator();
            this.ui.selectedSquare = null;
            this.ui.validMoves = [];
            this.ui.renderAllBoards();
            this.updateTimelineDisplay();

            console.log(`悔棋成功 - 撤销了 ${playerMovesUndone} 次玩家移动，回退到 index: ${this.currentTurnIndex}`);
            return true;
        }

        undoTimeTravel() {
            if (!this.preTimelineState) {
                return false;
            }

            const state = this.preTimelineState;

            this.timelineManager.reset();
            this.timelineManager.presentBoard = state.board.clone();
            this.board = this.timelineManager.presentBoard;

            this.history.moves = [...state.historyMoves];
            this.history.boardStates = [...state.historyBoards];

            this.capturedPieces = {
                player: [...state.capturedPieces.player],
                opponent: [...state.capturedPieces.opponent]
            };

            this.currentTurn = Color.WHITE;
            this.gameOver = false;

            this.preTimelineState = null;
            this.turnOrder = [];
            this.currentTurnIndex = 0;

            if (this.history.size() > 0) {
                const moves = this.history.moves;
                this.ui.lastMove = moves[moves.length - 1];
            } else {
                this.ui.lastMove = null;
            }

            this.ui.updateCapturedPieces();
            this.ui.updateStatusLights();
            this.ui.updateCheckIndicator();
            this.ui.selectedSquare = null;
            this.ui.validMoves = [];
            this.ui.renderAllBoards();

            console.log('悔棋成功：已撤销时间旅行');
            return true;
        }

        async saveGame() {
            const saveData = {
                version: '2.0.0',
                date: new Date().toISOString(),
                difficulty: this.ai.difficulty,
                currentTurn: this.currentTurn,
                gameOver: this.gameOver,
                capturedPieces: {
                    player: this.capturedPieces.player.map(p => ({ type: p.type, color: p.color })),
                    opponent: this.capturedPieces.opponent.map(p => ({ type: p.type, color: p.color }))
                },
                boardState: this.serializeBoard(),
                historyMoves: this.history.moves.map(m => ({
                    fromRow: m.fromRow,
                    fromCol: m.fromCol,
                    toRow: m.toRow,
                    toCol: m.toCol,
                    isCastling: m.isCastling,
                    isEnPassant: m.isEnPassant,
                    moveType: m.moveType
                })),
                timelineIsSplit: this.timelineManager.isSplit(),
                turnOrder: this.turnOrder,
                currentTurnIndex: this.currentTurnIndex
            };

            const saveName = `save_${new Date().toISOString().replace(/[:.]/g, '-')}`;
            const jsonString = JSON.stringify(saveData, null, 2);

            try {
                let fileSaved = false;
                
                if ('showSaveFilePicker' in window) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: `${saveName}.json`,
                            types: [
                                {
                                    description: 'JSON 存档文件',
                                    accept: {
                                        'application/json': ['.json'],
                                    },
                                },
                            ],
                        });
                        
                        const writable = await handle.createWritable();
                        await writable.write(jsonString);
                        await writable.close();
                        
                        fileSaved = true;
                        console.log(`文件已保存到: ${handle.name}`);
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            console.log('用户取消了保存');
                            alert('已取消保存');
                            return;
                        }
                        console.error('文件保存失败:', err);
                    }
                }
                
                if (!fileSaved) {
                    const choice = confirm(
                        '您的浏览器不支持文件保存API。\n\n' +
                        '您可以选择：\n' +
                        '- 点击"确定"：下载存档文件并保存到浏览器缓存\n' +
                        '- 点击"取消"：取消保存\n\n' +
                        '是否继续保存？'
                    );
                    
                    if (!choice) {
                        console.log('用户取消了保存');
                        return;
                    }
                    
                    this.downloadSave(saveName + '.json', jsonString);
                }
                
                let saves = this.getSavesFromStorage();
                saves.unshift({
                    name: saveName,
                    date: saveData.date,
                    data: saveData
                });
                
                if (saves.length > 10) {
                    saves = saves.slice(0, 10);
                }
                
                localStorage.setItem('chesstime_saves', JSON.stringify(saves));
                
                this.ui.showSaveSuccess();
                console.log(`游戏已保存为: ${saveName}`);
            } catch (error) {
                console.error('保存失败:', error);
                alert('保存失败，请重试');
            }
        }

        downloadSave(filename, content) {
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        getSavesFromStorage() {
            try {
                const savesStr = localStorage.getItem('chesstime_saves');
                if (savesStr) {
                    return JSON.parse(savesStr);
                }
            } catch (error) {
                console.error('读取存档列表失败:', error);
            }
            return [];
        }

        getSaveFiles() {
            const saves = this.getSavesFromStorage();
            return saves.map(save => ({
                name: save.name,
                date: save.date
            }));
        }

        loadGame(saveName) {
            if (saveName && typeof saveName === 'string') {
                const saves = this.getSavesFromStorage();
                const save = saves.find(s => s.name === saveName);
                if (save && save.data) {
                    this.restoreGame(save.data);
                    console.log(`存档已加载: ${saveName}`);
                    return;
                }
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const saveData = JSON.parse(event.target.result);
                            this.restoreGame(saveData);
                            console.log(`存档已加载: ${file.name}`);
                        } catch (error) {
                            console.error('加载存档失败:', error);
                            alert('存档文件格式错误');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            
            input.click();
        }

        restoreGame(saveData) {
            try {
                this.ai.setDifficulty(saveData.difficulty || 'medium');
                this.currentTurn = saveData.currentTurn || Color.WHITE;
                this.gameOver = saveData.gameOver || false;

                this.capturedPieces = {
                    player: saveData.capturedPieces?.player?.map(p => new Piece(p.type, p.color)) || [],
                    opponent: saveData.capturedPieces?.opponent?.map(p => new Piece(p.type, p.color)) || []
                };

                if (saveData.timelineIsSplit) {
                    console.warn('加载的存档包含分裂的时间线，当前版本部分支持此功能。');
                }

                this.timelineManager.reset();
                this.board = this.deserializeBoard(saveData.boardState);
                this.timelineManager.presentBoard = this.board;

                this.history = new GameHistory();
                if (saveData.historyMoves && saveData.historyMoves.length > 0) {
                    const tempBoard = new Board();
                    const tempHistory = new GameHistory();
                    
                    for (const moveData of saveData.historyMoves) {
                        const piece = tempBoard.getPiece(moveData.fromRow, moveData.fromCol);
                        if (piece) {
                            const capturedPiece = tempBoard.getPiece(moveData.toRow, moveData.toCol);
                            const move = new Move(
                                moveData.fromRow,
                                moveData.fromCol,
                                moveData.toRow,
                                moveData.toCol,
                                piece,
                                capturedPiece,
                                moveData.isCastling,
                                moveData.isEnPassant
                            );
                            if (moveData.moveType) {
                                move.moveType = moveData.moveType;
                            }
                            
                            tempHistory.addMove(move, tempBoard);
                            tempBoard.makeMove(move);
                        }
                    }
                    
                    this.history = tempHistory;
                }

                if (saveData.turnOrder) {
                    this.turnOrder = saveData.turnOrder;
                    this.currentTurnIndex = saveData.currentTurnIndex || 0;
                } else {
                    this.turnOrder = [];
                    this.currentTurnIndex = 0;
                }

                this.ui.showScreen('gameScreen');
                this.ui.resetGameUI();
                
                if (this.history.moves.length > 0) {
                    this.ui.lastMove = this.history.moves[this.history.moves.length - 1];
                    this.ui.renderAllBoards();
                }

                if (this.currentTurn === Color.BLACK && !this.gameOver) {
                    setTimeout(() => this.makeAIMove(), 500);
                }

            } catch (error) {
                console.error('恢复游戏失败:', error);
            }
        }

        serializeBoard() {
            const board = this.timelineManager.getPresentBoard();
            const grid = [];
            for (let row = 0; row < 8; row++) {
                const rowData = [];
                for (let col = 0; col < 8; col++) {
                    const piece = board.getPiece(row, col);
                    if (piece) {
                        rowData.push({
                            type: piece.type,
                            color: piece.color,
                            hasMoved: piece.hasMoved,
                            status: piece.status,
                            isFromTimeTravel: piece.isFromTimeTravel
                        });
                    } else {
                        rowData.push(null);
                    }
                }
                grid.push(rowData);
            }

            return {
                grid,
                enPassantTarget: board.enPassantTarget,
                castlingRights: board.castlingRights,
                halfMoveClock: board.halfMoveClock,
                fullMoveNumber: board.fullMoveNumber
            };
        }

        deserializeBoard(boardState) {
            const board = new Board();
            board.grid = board.createEmptyBoard();

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const pieceData = boardState.grid[row][col];
                    if (pieceData) {
                        const piece = new Piece(pieceData.type, pieceData.color);
                        piece.hasMoved = pieceData.hasMoved;
                        if (pieceData.status) {
                            piece.status = pieceData.status;
                        }
                        if (pieceData.isFromTimeTravel) {
                            piece.isFromTimeTravel = pieceData.isFromTimeTravel;
                        }
                        board.setPiece(row, col, piece);
                    }
                }
            }

            board.enPassantTarget = boardState.enPassantTarget;
            board.castlingRights = boardState.castlingRights;
            board.halfMoveClock = boardState.halfMoveClock;
            board.fullMoveNumber = boardState.fullMoveNumber;

            return board;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.chessGame = new ChessTimeGame();
    });
})();

(function() {
    /**
     * ChessTime - UI交互逻辑
     * 处理界面渲染和用户交互 - 支持时间旅行规则
     */

    const { 
        PieceType, 
        Color, 
        Board, 
        Move, 
        GameHistory, 
        PieceSymbols,
        PieceStatus,
        TimelineType,
        BoardTime,
        MoveType,
        TimelineManager
    } = window.ChessTime;

    class GameUI {
        constructor(game) {
            this.game = game;
            this.selectedSquare = null;
            this.validMoves = [];
            this.timeTravelMoves = [];
            this.lastMove = null;
            this.isTimeTravelMode = false;
            this.initElements();
            this.initEventListeners();
        }

        initElements() {
            this.screens = {
                mainMenu: document.getElementById('main-menu'),
                difficultyMenu: document.getElementById('difficulty-menu'),
                creditsScreen: document.getElementById('credits-screen'),
                loadScreen: document.getElementById('load-screen'),
                gameScreen: document.getElementById('game-screen')
            };

            this.buttons = {
                startGame: document.getElementById('start-game'),
                loadGame: document.getElementById('load-game'),
                difficultyBtn: document.getElementById('difficulty-btn'),
                credits: document.getElementById('credits'),
                backFromDifficulty: document.getElementById('back-from-difficulty'),
                backFromCredits: document.getElementById('back-from-credits'),
                backFromLoad: document.getElementById('back-from-load'),
                playerSave: document.getElementById('player-save'),
                playerLoad: document.getElementById('player-load'),
                playerPause: document.getElementById('player-pause'),
                restartGame: document.getElementById('restart-game'),
                backToMenu: document.getElementById('back-to-menu'),
                closeSaveModal: document.getElementById('close-save-modal'),
                closeLoadModal: document.getElementById('close-load-modal'),
                resumeGame: document.getElementById('resume-game'),
                pauseSave: document.getElementById('pause-save'),
                pauseLoad: document.getElementById('pause-load'),
                pauseSettings: document.getElementById('pause-settings'),
                quitToMenu: document.getElementById('quit-to-menu'),
                timeTravelMode: document.getElementById('time-travel-mode')
            };

            this.difficultyButtons = document.querySelectorAll('.difficulty-btn');
            
            this.chessBoards = {
                present: document.getElementById('present-chess-board'),
                past: document.getElementById('past-chess-board')
            };

            this.boardContainers = {
                present: document.getElementById('present-board-container'),
                past: document.getElementById('past-board-container')
            };

            this.timelineDivider = document.getElementById('timeline-divider');

            this.statusLights = {
                playerCheckmate: document.getElementById('player-checkmate'),
                playerStalemate: document.getElementById('player-stalemate'),
                opponentCheckmate: document.getElementById('opponent-checkmate'),
                opponentStalemate: document.getElementById('opponent-stalemate'),
                pastPlayerCheckmate: document.getElementById('past-player-checkmate'),
                pastPlayerStalemate: document.getElementById('past-player-stalemate'),
                presentPlayerCheckmate: document.getElementById('present-player-checkmate'),
                presentPlayerStalemate: document.getElementById('present-player-stalemate')
            };

            this.capturedPieces = {
                player: document.getElementById('player-captured'),
                opponent: document.getElementById('opponent-captured'),
                pastPlayer: document.getElementById('past-player-captured'),
                pastOpponent: document.getElementById('past-opponent-captured'),
                presentPlayer: document.getElementById('present-player-captured'),
                presentOpponent: document.getElementById('present-opponent-captured')
            };

            this.modals = {
                gameOver: document.getElementById('game-over-modal'),
                saveSuccess: document.getElementById('save-success-modal'),
                loadGame: document.getElementById('load-game-modal'),
                pause: document.getElementById('pause-modal')
            };

            this.saveList = document.getElementById('save-list');
            this.modalSaveList = document.getElementById('modal-save-list');
            this.gameResult = document.getElementById('game-result');
            this.gameResultMessage = document.getElementById('game-result-message');
            
            this.windowWarning = document.getElementById('window-warning');
            this.gameContainer = document.querySelector('.game-container');

            this.timelineElements = {
                mode: document.getElementById('timeline-mode'),
                playerScore: document.getElementById('player-score'),
                aiScore: document.getElementById('ai-score'),
                pastTurnIndicator: document.getElementById('past-turn-indicator'),
                presentTurnIndicator: document.getElementById('present-turn-indicator')
            };

            this.banishedArea = document.getElementById('banished-area');
            this.banishedPieces = document.getElementById('banished-pieces');
            this.timeTravelHint = document.getElementById('time-travel-hint');

            this.checkIndicator = document.getElementById('check-indicator');
            this.checkMessage = document.getElementById('check-message');
        }

        initEventListeners() {
            this.buttons.startGame.addEventListener('click', () => this.game.startGame());
            this.buttons.loadGame.addEventListener('click', () => this.showLoadScreen());
            this.buttons.difficultyBtn.addEventListener('click', () => this.showScreen('difficultyMenu'));
            this.buttons.credits.addEventListener('click', () => this.showScreen('creditsScreen'));
            
            this.buttons.backFromDifficulty.addEventListener('click', () => this.showScreen('mainMenu'));
            this.buttons.backFromCredits.addEventListener('click', () => this.showScreen('mainMenu'));
            this.buttons.backFromLoad.addEventListener('click', () => this.showScreen('mainMenu'));

            this.difficultyButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const difficulty = btn.dataset.difficulty;
                    this.game.setDifficulty(difficulty);
                    this.updateDifficultySelection(difficulty);
                });
            });

            this.buttons.playerSave.addEventListener('click', () => this.game.saveGame());
            this.buttons.playerLoad.addEventListener('click', () => this.showLoadModal());
            this.buttons.playerPause.addEventListener('click', () => this.showModal('pause'));

            this.buttons.timeTravelMode.addEventListener('click', () => this.toggleTimeTravelMode());

            const playerUndoBtn = document.getElementById('player-undo');
            if (playerUndoBtn) {
                playerUndoBtn.addEventListener('click', () => this.game.undoMove());
            }

            this.buttons.restartGame.addEventListener('click', () => {
                this.hideModal('gameOver');
                this.game.startGame();
            });

            this.buttons.backToMenu.addEventListener('click', () => {
                this.hideModal('gameOver');
                this.showScreen('mainMenu');
            });

            this.buttons.closeSaveModal.addEventListener('click', () => this.hideModal('saveSuccess'));
            this.buttons.closeLoadModal.addEventListener('click', () => this.hideModal('loadGame'));
            
            this.buttons.resumeGame.addEventListener('click', () => this.hideModal('pause'));
            this.buttons.pauseSave.addEventListener('click', () => {
                this.hideModal('pause');
                this.game.saveGame();
            });
            this.buttons.pauseLoad.addEventListener('click', () => {
                this.hideModal('pause');
                this.showLoadModal();
            });
            this.buttons.pauseSettings.addEventListener('click', () => {
                alert('设置功能开发中...');
            });
            this.buttons.quitToMenu.addEventListener('click', () => {
                this.hideModal('pause');
                this.showScreen('mainMenu');
            });
        }

        toggleTimeTravelMode() {
            if (!this.game.canTimeTravel()) {
                alert('时间线已分裂，无法再次进行时间旅行！');
                return;
            }

            this.isTimeTravelMode = !this.isTimeTravelMode;
            
            if (this.isTimeTravelMode) {
                this.buttons.timeTravelMode.classList.add('active');
                this.timeTravelHint.classList.remove('hidden');
            } else {
                this.buttons.timeTravelMode.classList.remove('active');
                this.timeTravelHint.classList.add('hidden');
            }

            this.selectedSquare = null;
            this.validMoves = [];
            this.timeTravelMoves = [];
            this.renderAllBoards();
        }

        showScreen(screenName) {
            Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
            this.screens[screenName].classList.add('active');
        }

        updateDifficultySelection(selectedDifficulty) {
            this.difficultyButtons.forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.difficulty === selectedDifficulty) {
                    btn.classList.add('selected');
                }
            });
        }

        updateTimelineDisplay() {
            const timelineManager = this.game.timelineManager;
            
            if (timelineManager.isSplit()) {
                this.timelineElements.mode.textContent = '时间线分裂';
                this.timelineElements.mode.classList.add('split');
                this.boardContainers.past.classList.remove('hidden');
                this.timelineDivider.classList.remove('hidden');
                this.buttons.timeTravelMode.classList.add('disabled');
                this.buttons.timeTravelMode.disabled = true;
            } else {
                this.timelineElements.mode.textContent = '单一时间线';
                this.timelineElements.mode.classList.remove('split');
                this.boardContainers.past.classList.add('hidden');
                this.timelineDivider.classList.add('hidden');
                this.buttons.timeTravelMode.classList.remove('disabled');
                this.buttons.timeTravelMode.disabled = false;
            }

            this.updateScores();
            this.updateTurnIndicators();
        }

        updateScores() {
            if (this.game.gameOver) {
                const scores = this.game.timelineManager.calculateEndGameScores();
                this.timelineElements.playerScore.textContent = scores.player.toFixed(1);
                this.timelineElements.aiScore.textContent = scores.ai.toFixed(1);
            } else {
                this.timelineElements.playerScore.textContent = '-';
                this.timelineElements.aiScore.textContent = '-';
            }
        }

        updateTurnIndicators() {
            const timelineManager = this.game.timelineManager;
            
            if (timelineManager.isSplit()) {
                const activeBoard = timelineManager.getActiveBoard();
                const currentTurn = this.game.currentTurn;
                
                this.timelineElements.pastTurnIndicator.classList.remove('hidden');
                this.timelineElements.presentTurnIndicator.classList.remove('hidden');
                
                if (activeBoard.isPastBoard()) {
                    this.timelineElements.pastTurnIndicator.textContent = 
                        (currentTurn === Color.WHITE ? '玩家' : 'AI') + ' 行动中';
                    this.timelineElements.pastTurnIndicator.classList.add('active-turn');
                    this.timelineElements.presentTurnIndicator.textContent = '等待中';
                    this.timelineElements.presentTurnIndicator.classList.remove('active-turn');
                } else {
                    this.timelineElements.presentTurnIndicator.textContent = 
                        (currentTurn === Color.WHITE ? '玩家' : 'AI') + ' 行动中';
                    this.timelineElements.presentTurnIndicator.classList.add('active-turn');
                    this.timelineElements.pastTurnIndicator.textContent = '等待中';
                    this.timelineElements.pastTurnIndicator.classList.remove('active-turn');
                }
            } else {
                this.timelineElements.pastTurnIndicator.classList.add('hidden');
                this.timelineElements.presentTurnIndicator.classList.add('hidden');
            }
        }

        updateBanishedPieces() {
            const banished = this.game.timelineManager.getBanishedPieces();
            
            if (banished.length === 0) {
                this.banishedArea.classList.add('hidden');
                return;
            }

            this.banishedArea.classList.remove('hidden');
            this.banishedPieces.innerHTML = '';

            banished.forEach(piece => {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'banished-piece';
                pieceElement.textContent = PieceSymbols[piece.color][piece.type];
                this.banishedPieces.appendChild(pieceElement);
            });
        }

        updateCheckIndicator() {
            const timelineManager = this.game.timelineManager;
            let isPlayerInCheck = false;
            let isAIInCheck = false;
            let checkBoard = null;

            if (timelineManager.isSplit()) {
                const pastBoard = timelineManager.getPastBoard();
                const presentBoard = timelineManager.getPresentBoard();
                
                if (pastBoard.isInCheck(Color.WHITE) || presentBoard.isInCheck(Color.WHITE)) {
                    isPlayerInCheck = true;
                    checkBoard = pastBoard.isInCheck(Color.WHITE) ? pastBoard : presentBoard;
                }
                if (pastBoard.isInCheck(Color.BLACK) || presentBoard.isInCheck(Color.BLACK)) {
                    isAIInCheck = true;
                }
            } else {
                const presentBoard = timelineManager.getPresentBoard();
                isPlayerInCheck = presentBoard.isInCheck(Color.WHITE);
                isAIInCheck = presentBoard.isInCheck(Color.BLACK);
                if (isPlayerInCheck) {
                    checkBoard = presentBoard;
                }
            }

            if (isPlayerInCheck && this.game.currentTurn === Color.WHITE) {
                this.checkIndicator.classList.remove('hidden');
                this.checkIndicator.classList.add('player-check');
                this.checkMessage.textContent = '将军!';
            } else if (isAIInCheck && this.game.currentTurn === Color.BLACK) {
                this.checkIndicator.classList.remove('hidden');
                this.checkIndicator.classList.remove('player-check');
                this.checkIndicator.classList.add('ai-check');
                this.checkMessage.textContent = 'AI被将军!';
            } else {
                this.checkIndicator.classList.add('hidden');
                this.checkIndicator.classList.remove('player-check', 'ai-check');
            }
        }

        renderAllBoards() {
            const timelineManager = this.game.timelineManager;
            
            if (timelineManager.isSplit()) {
                this.renderBoard(timelineManager.getPastBoard(), this.chessBoards.past, BoardTime.PAST);
                this.renderBoard(timelineManager.getPresentBoard(), this.chessBoards.present, BoardTime.PRESENT);
            } else {
                this.renderBoard(timelineManager.getPresentBoard(), this.chessBoards.present, BoardTime.PRESENT);
            }

            this.updateTimelineDisplay();
        }

        renderBoard(board, boardElement, boardTime = BoardTime.PRESENT) {
            if (!boardElement) return;
            
            boardElement.innerHTML = '';
            
            const kingPos = board.findKing(this.game.currentTurn);
            const isInCheck = board.isInCheck(this.game.currentTurn);
            
            const colLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const rowLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = document.createElement('div');
                    square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                    square.dataset.row = row;
                    square.dataset.col = col;
                    square.dataset.boardTime = boardTime;
                    
                    if (col === 0) {
                        const rowLabel = document.createElement('span');
                        rowLabel.className = 'coord-label row-label';
                        rowLabel.textContent = rowLabels[row];
                        square.appendChild(rowLabel);
                    }
                    if (row === 7) {
                        const colLabel = document.createElement('span');
                        colLabel.className = 'coord-label col-label';
                        colLabel.textContent = colLabels[col];
                        square.appendChild(colLabel);
                    }
                    
                    const piece = board.getPiece(row, col);
                    if (piece) {
                        const pieceElement = document.createElement('span');
                        let pieceClass = `piece ${piece.color}`;
                        if (piece.isSpectator()) {
                            pieceClass += ' spectator';
                        }
                        pieceElement.className = pieceClass;
                        pieceElement.textContent = piece.getSymbol();
                        square.appendChild(pieceElement);
                    }

                    if (isInCheck && kingPos && kingPos.row === row && kingPos.col === col) {
                        square.classList.add('check-square');
                    }

                    if (this.selectedSquare && 
                        this.selectedSquare.row === row && 
                        this.selectedSquare.col === col &&
                        this.selectedSquare.boardTime === boardTime) {
                        square.classList.add('selected');
                    }

                    let isValidMove = false;
                    let isTimeTravelMove = false;

                    if (this.isTimeTravelMode && !this.game.timelineManager.isSplit()) {
                        isTimeTravelMove = this.timeTravelMoves.some(m => 
                            m.toRow === row && m.toCol === col
                        );
                        if (isTimeTravelMove) {
                            square.classList.add('valid-move');
                            square.style.boxShadow = 'inset 0 0 20px rgba(157, 78, 221, 0.6)';
                        }
                    } else {
                        isValidMove = this.validMoves.some(m => 
                            m.toRow === row && m.toCol === col
                        );
                        if (isValidMove) {
                            const targetPiece = board.getPiece(row, col);
                            square.classList.add(targetPiece ? 'valid-capture' : 'valid-move');
                        }
                    }

                    if (this.lastMove && this.lastMove.boardTime === boardTime) {
                        if (this.lastMove.fromRow === row && this.lastMove.fromCol === col) {
                            square.classList.add('last-move-from');
                        }
                        if (this.lastMove.toRow === row && this.lastMove.toCol === col) {
                            square.classList.add('last-move-to');
                        }
                    }

                    square.addEventListener('click', () => this.handleSquareClick(row, col, boardTime));
                    
                    boardElement.appendChild(square);
                }
            }
        }

        handleSquareClick(row, col, boardTime) {
            const timelineManager = this.game.timelineManager;
            
            if (this.game.gameOver) {
                return;
            }

            const activeBoard = timelineManager.getActiveBoard();
            if (timelineManager.isSplit() && activeBoard.getBoardTime() !== boardTime) {
                return;
            }

            const board = boardTime === BoardTime.PAST ? 
                timelineManager.getPastBoard() : 
                timelineManager.getPresentBoard();

            if (!board) return;

            if (this.isTimeTravelMode && !timelineManager.isSplit()) {
                this.handleTimeTravelClick(row, col, board);
                return;
            }

            if (this.game.currentTurn !== Color.WHITE) {
                return;
            }

            const piece = board.getPiece(row, col);

            if (this.selectedSquare) {
                const selectedPiece = board.getPiece(this.selectedSquare.row, this.selectedSquare.col);
                
                if (piece && piece.color === selectedPiece.color) {
                    this.selectedSquare = { row, col, boardTime };
                    this.validMoves = board.getLegalMoves(row, col);
                    this.renderAllBoards();
                    return;
                }

                const move = this.validMoves.find(m => 
                    m.toRow === row && m.toCol === col
                );

                if (move) {
                    this.game.makeMove(move, boardTime);
                    this.selectedSquare = null;
                    this.validMoves = [];
                    this.lastMove = { ...move, boardTime };
                    this.renderAllBoards();
                    return;
                }

                this.selectedSquare = null;
                this.validMoves = [];
                this.renderAllBoards();
                return;
            }

            if (piece && piece.color === Color.WHITE && !piece.isSpectator() && !piece.isBanished()) {
                this.selectedSquare = { row, col, boardTime };
                this.validMoves = board.getLegalMoves(row, col);
                this.renderAllBoards();
            }
        }

        handleTimeTravelClick(row, col, board) {
            if (this.selectedSquare) {
                const timeMove = this.timeTravelMoves.find(m => 
                    m.toRow === row && m.toCol === col
                );

                if (timeMove) {
                    const success = this.game.performTimeTravel(
                        this.selectedSquare.row,
                        this.selectedSquare.col,
                        row,
                        col
                    );

                    if (success) {
                        this.selectedSquare = null;
                        this.validMoves = [];
                        this.timeTravelMoves = [];
                        this.isTimeTravelMode = false;
                        this.buttons.timeTravelMode.classList.remove('active');
                        this.timeTravelHint.classList.add('hidden');
                        this.lastMove = { ...timeMove, boardTime: BoardTime.PRESENT };
                        this.renderAllBoards();
                    }
                    return;
                }

                this.selectedSquare = null;
                this.validMoves = [];
                this.timeTravelMoves = [];
                this.renderAllBoards();
                return;
            }

            const piece = board.getPiece(row, col);
            if (piece && piece.color === Color.WHITE && !piece.isSpectator() && !piece.isBanished()) {
                this.selectedSquare = { row, col, boardTime: BoardTime.PRESENT };
                this.timeTravelMoves = board.getTimeTravelMoves(row, col);
                this.renderAllBoards();
            }
        }

        updateStatusLights() {
            const timelineManager = this.game.timelineManager;
            const presentBoard = timelineManager.getPresentBoard();

            const playerCheckmate = presentBoard.isCheckmate(Color.WHITE);
            const opponentCheckmate = presentBoard.isCheckmate(Color.BLACK);
            const playerStalemate = presentBoard.isStalemate(Color.WHITE);
            const opponentStalemate = presentBoard.isStalemate(Color.BLACK);

            this.updateStatusLight(this.statusLights.playerCheckmate, playerCheckmate);
            this.updateStatusLight(this.statusLights.opponentCheckmate, opponentCheckmate);
            this.updateStatusLight(this.statusLights.playerStalemate, playerStalemate);
            this.updateStatusLight(this.statusLights.opponentStalemate, opponentStalemate);

            if (timelineManager.isSplit()) {
                const pastBoard = timelineManager.getPastBoard();
                const pastPlayerCheckmate = pastBoard.isCheckmate(Color.WHITE);
                const pastPlayerStalemate = pastBoard.isStalemate(Color.WHITE);
                const presentPlayerCheckmate = presentBoard.isCheckmate(Color.WHITE);
                const presentPlayerStalemate = presentBoard.isStalemate(Color.WHITE);

                this.updateStatusLight(this.statusLights.pastPlayerCheckmate, pastPlayerCheckmate);
                this.updateStatusLight(this.statusLights.pastPlayerStalemate, pastPlayerStalemate);
                this.updateStatusLight(this.statusLights.presentPlayerCheckmate, presentPlayerCheckmate);
                this.updateStatusLight(this.statusLights.presentPlayerStalemate, presentPlayerStalemate);
            }
        }

        updateStatusLight(element, isActive) {
            if (!element) return;
            if (isActive) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        }

        updateCapturedPieces() {
            if (this.capturedPieces.player) {
                this.capturedPieces.player.innerHTML = '';
                this.game.capturedPieces.player.forEach(piece => {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'captured-piece';
                    pieceElement.textContent = PieceSymbols[piece.color][piece.type];
                    this.capturedPieces.player.appendChild(pieceElement);
                });
            }

            if (this.capturedPieces.opponent) {
                this.capturedPieces.opponent.innerHTML = '';
                this.game.capturedPieces.opponent.forEach(piece => {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'captured-piece';
                    pieceElement.textContent = PieceSymbols[piece.color][piece.type];
                    this.capturedPieces.opponent.appendChild(pieceElement);
                });
            }
        }

        showGameOver(winner, scores = null) {
            if (scores) {
                if (winner === Color.WHITE) {
                    this.gameResult.textContent = '玩家获胜！';
                    this.gameResultMessage.textContent = `积分: 玩家 ${scores.player} - AI ${scores.ai}`;
                } else if (winner === Color.BLACK) {
                    this.gameResult.textContent = 'AI获胜！';
                    this.gameResultMessage.textContent = `积分: 玩家 ${scores.player} - AI ${scores.ai}`;
                } else {
                    this.gameResult.textContent = '平局！';
                    this.gameResultMessage.textContent = `积分: 玩家 ${scores.player} - AI ${scores.ai}`;
                }
            } else {
                if (winner === Color.WHITE) {
                    this.gameResult.textContent = '玩家获胜！';
                    this.gameResultMessage.textContent = '恭喜你战胜了AI对手！';
                } else if (winner === Color.BLACK) {
                    this.gameResult.textContent = 'AI获胜！';
                    this.gameResultMessage.textContent = '再接再厉，下次一定能赢！';
                } else {
                    this.gameResult.textContent = '平局！';
                    this.gameResultMessage.textContent = '这是一场精彩的对局！';
                }
            }
            this.showModal('gameOver');
        }

        showSaveSuccess() {
            this.showModal('saveSuccess');
        }

        showLoadScreen() {
            this.updateSaveList(this.saveList);
            this.showScreen('loadScreen');
        }

        showLoadModal() {
            this.updateSaveList(this.modalSaveList, true);
            this.showModal('loadGame');
        }

        updateSaveList(container, isModal = false) {
            container.innerHTML = '';
            const saves = this.game.getSaveFiles();

            if (saves.length === 0) {
                const noSaves = document.createElement('p');
                noSaves.className = 'no-saves';
                noSaves.textContent = '暂无存档';
                container.appendChild(noSaves);
                return;
            }

            saves.forEach(save => {
                const saveItem = document.createElement('div');
                saveItem.className = 'save-item';
                
                const saveName = document.createElement('div');
                saveName.className = 'save-name';
                saveName.textContent = save.name;
                
                const saveDate = document.createElement('div');
                saveDate.className = 'save-date';
                saveDate.textContent = new Date(save.date).toLocaleString('zh-CN');

                saveItem.appendChild(saveName);
                saveItem.appendChild(saveDate);

                saveItem.addEventListener('click', () => {
                    this.game.loadGame(save.name);
                    if (isModal) {
                        this.hideModal('loadGame');
                    } else {
                        this.showScreen('gameScreen');
                    }
                });

                container.appendChild(saveItem);
            });
        }

        showModal(modalName) {
            this.modals[modalName].classList.remove('hidden');
        }

        hideModal(modalName) {
            this.modals[modalName].classList.add('hidden');
        }

        resetGameUI() {
            this.selectedSquare = null;
            this.validMoves = [];
            this.timeTravelMoves = [];
            this.lastMove = null;
            this.isTimeTravelMode = false;
            this.buttons.timeTravelMode.classList.remove('active');
            this.timeTravelHint.classList.add('hidden');
            
            this.updateStatusLights();
            this.updateCapturedPieces();
            this.updateBanishedPieces();
            this.updateCheckIndicator();
            this.renderAllBoards();
            this.checkWindowSize();
        }

        checkWindowSize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const aspectRatio = width / height;

            const isResolutionOK = (width >= 1280 && height >= 960) || (width >= 960 && height >= 1280);
            const isRatioOK = aspectRatio >= 0.4 && aspectRatio <= 2.5;

            const needsAdaptation = !isResolutionOK || !isRatioOK;

            if (needsAdaptation) {
                this.showWindowWarning();
                this.applyAdaptedLayout();
            } else {
                this.hideWindowWarning();
                this.applyNormalLayout();
            }
        }

        showWindowWarning() {
            if (this.windowWarning) {
                this.windowWarning.classList.remove('hidden');
            }
        }

        hideWindowWarning() {
            if (this.windowWarning) {
                this.windowWarning.classList.add('hidden');
            }
        }

        applyAdaptedLayout() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const aspectRatio = width / height;

            Object.values(this.chessBoards).forEach(board => {
                if (board) {
                    board.classList.remove('normal');
                    board.classList.add('adapted');
                    board.classList.remove('portrait', 'landscape');

                    if (aspectRatio < 1) {
                        board.classList.add('portrait');
                    } else {
                        board.classList.add('landscape');
                    }
                }
            });

            if (this.gameContainer) {
                this.gameContainer.classList.add('adapted-layout');
            }

            this.renderAllBoards();
        }

        applyNormalLayout() {
            Object.values(this.chessBoards).forEach(board => {
                if (board) {
                    board.classList.remove('adapted', 'portrait', 'landscape');
                    board.classList.add('normal');
                }
            });

            if (this.gameContainer) {
                this.gameContainer.classList.remove('adapted-layout');
            }

            this.renderAllBoards();
        }
    }

    window.GameUI = GameUI;

    window.addEventListener('resize', () => {
        if (window.chessGame && window.chessGame.ui) {
            window.chessGame.ui.checkWindowSize();
        }
    });
})();

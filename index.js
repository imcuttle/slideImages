/**
 * Created by Moyu on 16/9/23.
 */

function slideImage (options) {

    var default_options = {
        // el: '',
        // images: [{ realUrl: '', thumbUrl: ''}]
        currentIndex: 0,
        onMoveStart: null,
        onMoving: null,
        onMoveWillEnd: null,
        onMoveEnded: null
    }

    Object.assign(this, default_options, options)

    this.initElements();

    this.bindEvents();

    this._reset();
}

slideImage.prototype = {

    _isElemHasImage: function (elem) {
        return !!elem._image;
    },

    addImage: function (image) {
        this.images.push(image)
    },

    getImage: function (i) {
        return this.images[i];
    },

    pushRightMoveImage: function () {
        this.nextSlideItem = this.currSlideItem;
        this.currSlideItem = this.prevSlideItem;
        this.prevSlideItem = this._makeItemDom(this.images[this.currentIndex - 2]);
        this.currentIndex--;

        var items = this.el.querySelectorAll('li.slideImage-Item')
        items[0].parentElement.insertBefore(this.prevSlideItem, items[0])
        items[2].remove();
    },
    pushLeftMoveImage: function () {
        this.prevSlideItem = this.currSlideItem;
        this.currSlideItem = this.nextSlideItem;
        this.nextSlideItem = this._makeItemDom(this.images[this.currentIndex + 2]);
        this.currentIndex++;

        var items = this.el.querySelectorAll('li.slideImage-Item')
        items[1].parentElement.appendChild(this.nextSlideItem)
        items[0].remove();
    },

    _reset: function () {
        var self = this;
        var lis = this.el.querySelectorAll('li.slideImage-Item');
        lis.forEach(function (ls, i) {
            ls._image = self.images[self.currentIndex - 1 + i];
            delete ls._translateX
            delete ls.baseX
            ls.style.webkitTransform = ls.style.transform = ''
            ls.style.webkitTransition = ls.style.transition = ''
        });
        this.prevSlideItem = lis[0];
        this.currSlideItem = lis[1];
        this.nextSlideItem = lis[2];

        var gap = 20;
        var elWidth = this.el.clientWidth;
        // this._elemHide(this.prevSlideItem);
        this._setElemTranslateX(this.prevSlideItem, -elWidth - gap)
        this.prevSlideItem.baseX = -elWidth - gap;
        // this._elemHide(this.nextSlideItem);
        this._setElemTranslateX(this.nextSlideItem, elWidth + gap)
        this.nextSlideItem.baseX = elWidth + gap;
    },

    getCurrent: function () {
        return this.currSlideItem._image;
    },

    constructor: slideImage,

    _makeItemDom: function (img) {
        function createImage(url) {
            var imgDom = document.createElement('img')
            imgDom.src = url;
            if(url === img.thumbUrl) {
                var realImage = new Image();
                realImage.src = img.realUrl;
                realImage.onload = function (e) {
                    imgDom.src = img.realUrl
                }
            }
            return imgDom;
        }

        var li = document.createElement('li');
        li.classList.add('slideImage-Item');
        if(!img) {
            return li;
        } else {
            var url = img.thumbUrl || img.realUrl;
            var imgDom = createImage(url);
            var div = document.createElement('div');
            div.appendChild(imgDom);
            this.bindImgEvents(div);
            li.appendChild(div);
            return li;
        }
    },

    initElements: function () {

        var ul = document.createElement('ul');
        ul.classList.add('slideImage-Container');

        var self = this;
        [this.images[this.currentIndex-1], this.images[this.currentIndex], this.images[this.currentIndex+1]]
            .forEach(function (img, i) {
                ul.appendChild(self._makeItemDom(img));
            })

        this.el.innerHTML = '';
        this.el.appendChild(ul);

    },

    bindEvents: function () {
        var el = this.el;
        var self = this;
        el.addEventListener("touchstart",function (e) {
            if(self._lock) {
                return;
            }
            self.touchStart(e)
        }, false);
        el.addEventListener("touchmove", function (e) {
            if(self._lock) {
                return;
            }
            self.touchMove(e)
        }, false);
        el.addEventListener("touchend", function (e) {
            if(self._lock) {
                return;
            }
            self.touchEnd(e)
        }, false);
    },

    touchStart: function (e) {
        var touch = e.touches[0];
        this._start = {
            x: touch.clientX,
            y: touch.clientY
        }

        this._beginTime = e.timeStamp;
        this.setAllAnimationDuration(-1);

        this.onMoveStart && this.onMoveStart(e)
    },

    setScale: function (scale, pos) {
        var o = {}
        if(pos) {
            o = {transformOrigin: pos.x + 'px '+pos.y+'px'}
            this.currSlideItem._scaleOrigin = pos;
        }
        this.currSlideItem._scale = scale;
        this._setElemStyle(this.currSlideItem.querySelector('div'), Object.assign({
            transform: 'scale(' + scale + ')'
        }, o))
    },

    touchMove: function (e) {

        var touch = e.touches[0];
        var clientX = touch.clientX;
        var clientY = touch.clientY;
        var startX = this._start.x;
        var startY = this._start.y;
        var deltaX = clientX - startX;
        var deltaY = clientY - startY;

        e.preventDefault(); // don't trigger default scroll screen
        this._translateX = deltaX;
        this._moved = true;

        this.isMovingLeft() ? this._elemShow(this.nextSlideItem) : this._elemShow(this.prevSlideItem)
        this._setElemTranslateX(this.currSlideItem, deltaX);
        this._setElemTranslateX(this.prevSlideItem, deltaX);
        this._setElemTranslateX(this.nextSlideItem, deltaX);

        this.onMoving && this.onMoving(e, this.isMovingLeft() ? 'left' : 'right');
    },

    recoverImgSize: function () {
        this._setElemStyle(this.currSlideItem.querySelector('div'),
            { transform: '', transformOrigin: ''}
        )
    },

    touchEnd: function (e) {

        if(!this._moved) {
            return;
        }
        var movedSize = Math.abs(this._translateX);
        var clientWidth = this.el.clientWidth;
        var self = this;
        var isMovingLeft = this.isMovingLeft();
        var target = isMovingLeft ? this.nextSlideItem : this.prevSlideItem;

        if(this._isReached(e.timeStamp - this._beginTime) && this._isElemHasImage(target)) {
            this.onMoveWillEnd && this.onMoveWillEnd(e, this.isMovingLeft() ? 'left' : 'right')

            var time = this._computeAnimateTime(clientWidth - movedSize);
            console.log('reached time: ', time)
            this.setAllAnimationDuration(time);
            this.setAllTranslateX(isMovingLeft ? -clientWidth : clientWidth);

            delete this.currSlideItem._scale;
            self.recoverImgSize();

            this._lock = setTimeout(function () {
                self.isMovingLeft() ? self.pushLeftMoveImage() : self.pushRightMoveImage();
                self._reset();

                self.onMoveEnded && self.onMoveEnded(e, isMovingLeft ? 'left' : 'right');

                delete self._lock;
            }, time * 1000)

        } else {

            var time = this._computeAnimateTime(movedSize);
            console.log('unreached time: ', time)
            this.setAllAnimationDuration(time);
            this.setAllTranslateX(0);

        }
        delete this._moved;
        delete this._start;
    },


    bindImgEvents: function(img) {
        img.addEventListener('touchstart', function (e) {
            if (e.touches.length > 1) {
                this._dist = Math.sqrt(
                    Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
                    Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
                );
                e.stopPropagation();
                return;
            }
        }.bind(this), false);

        img.addEventListener('touchmove', function(e) {
            if(e.touches.length > 1) {
                var dist = Math.sqrt(
                    Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
                    Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
                );

                this.setScale(dist/this._dist, {
                    x: (e.touches[0].clientX+e.touches[1].clientX)>>1,
                    y: (e.touches[0].clientY+e.touches[1].clientY)>>1// - rect.top
                })
                e.stopPropagation();
                return;
            } else {
                if(this.currSlideItem._scale && this._start && this.currSlideItem._scaleOrigin && this.currSlideItem._scale>1.4) {
                    var start = this._start || {}
                    var startX = start.x || 0
                    var startY = start.y || 0
                    var baseOrigin = this.currSlideItem._scaleOrigin

                    var deltaX = (e.touches[0].clientX-startX)
                    var deltaY = (e.touches[0].clientY-startY)

                    console.log(deltaX, deltaY)

                    this.currSlideItem._tempOrigin = {x: (-deltaX+baseOrigin.x), y: (-deltaY+baseOrigin.y)}
                    this._setElemStyle(this.currSlideItem.querySelector('div'), {
                        transformOrigin: this.currSlideItem._tempOrigin.x + 'px ' + this.currSlideItem._tempOrigin.y + 'px'
                    });
                    e.stopPropagation();
                }
            }
        }.bind(this), false)
        img.addEventListener('touchend', function (e) {
            // e.preventDefault();  //don't trigger click
            if(this.currSlideItem._tempOrigin) {
                this.currSlideItem._scaleOrigin = this.currSlideItem._tempOrigin;
                delete this.currSlideItem._tempOrigin;
                e.stopPropagation();
            }
            if(this.currSlideItem._scale && this.currSlideItem._scale < 1) {
                delete this.currSlideItem._scale;
                this.recoverImgSize();
                e.stopPropagation();
                return;
            }

        }.bind(this), false)
    },


    isMovingLeft: function () {
        return this._translateX < 0;
    },

    setAllAction: function (action) {
        var self = this;
        [this.prevSlideItem, this.currSlideItem, this.nextSlideItem]
            .forEach(function (elem) {
                action.call(self, elem)
            })
    },
    setAllTranslateX: function (x) {
        this.setAllAction(function (elem) {
            this._setElemTranslateX(elem, x)
        })
    },
    setAllAnimationDuration: function (sec) {
        this.setAllAction(function (elem) {
            this._setAnimationDuration(elem, sec)
        })
    },

    _computeAnimateTime: function (size) {
        return Math.abs(size) * .0006
    },
    _isReached: function (timestamp) {
        var delta = Math.abs(this._translateX) - this.el.clientWidth * .4
        return (delta>=20 || timestamp <= 300 && timestamp >= 60);
    },
    _setAnimationDuration: function (elem, sec) {
        var s = 'transform ' + sec + 's ease';
        if(sec < 0) {
            sec = '';
            s = ''
        }
        this._setElemStyle(elem, {
            webkitTransition: s,
            transition: s
        })
    },
    _setElemStyle: function (elem, style) {
        Object.assign(elem.style, style)
    },
    _elemHide: function (elem) {
        this._setElemStyle(elem, { visibility: 'hidden' })
    },
    _elemShow: function (elem) {
        this._setElemStyle(elem, { visibility: 'visible' })
    },
    _setElemTranslateX: function (elem, x) {
        x += (elem.baseX || 0);
        var s = 'translateX(' + x + 'px)';
        elem._translateX = x;
        this._setElemStyle(elem, {
            webkitTransform: s,
            transform: s
        })
    },
    _getElemTranslateX: function (elem) {
        return elem._translateX || 0
    }

}

if(typeof module != 'undefined' && module.exports) {
    module.exports = slideImage
}
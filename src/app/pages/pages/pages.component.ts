import { Component,
  Input,
  OnInit,
  ElementRef,
  AfterViewInit,
  EventEmitter,
  Output,
  OnChanges,
  SimpleChanges } from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs/Observable';
import {ActivatedRoute, Params} from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as _ from 'lodash';
import * as $ from 'jquery';
import {PageState} from '../../store/pages/page.state';
import {AppState} from '../../store/app.reducers';
import {getPage} from '../../store/pages/page.selectors';
import {HttpClient} from '@angular/common/http';
import {HttpClientService} from '../../services/http-client.service';


@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.css']
})
export class PagesComponent implements OnInit, AfterViewInit {

  page$: Observable<PageState>;
  pageToDisplay: string;

  _htmlMarkup: SafeHtml;
  hasScriptSet: boolean;
  hasHtmlSet: boolean;

  constructor(private store: Store<AppState>, private httpClientService: HttpClientService, private route: ActivatedRoute, private sanitizer: DomSanitizer, private elementRef: ElementRef) {
    this.page$ = store.select(getPage);
  }

  ngOnInit() {
    this.hasScriptSet = false;
    this.hasHtmlSet = false;
    if (this.page$) {
      this.page$.subscribe((thePage) => {
        if (thePage) {
          thePage.pages.forEach((page) => {
            this.route.params.forEach((params: Params) => {
              if (page.id === params['id'] && page.category === 'leaf') {
                this.pageToDisplay = page.pageContent;
                try {
                  this._htmlMarkup = this.sanitizer.bypassSecurityTrustHtml(
                    this.pageToDisplay
                  );
                  this.hasHtmlSet = true;
                } catch (e) {
                  console.log(JSON.stringify(e));
                }
              } if (page.category === '' && page.id === params['id']) {
                // here get the statistics page or page with no header button
                this.pageToDisplay = page.pageContent;
                try {
                  this._htmlMarkup = this.sanitizer.bypassSecurityTrustHtml(
                    this.pageToDisplay
                  );
                  this.hasHtmlSet = true;
                } catch (e) {
                  console.log(JSON.stringify(e));
                }
              } else if (page.id === params['id']) {
                this.pageToDisplay = page.pageContent;
                try {
                  this._htmlMarkup = this.sanitizer.bypassSecurityTrustHtml(
                    this.pageToDisplay
                  );
                  this.hasHtmlSet = true;
                } catch (e) {
                  console.log(JSON.stringify(e));
                }
              }
            });
          });
        }
      });
    }
  }

  ngAfterViewInit() {
    this.setScriptsOnHtmlContent(
      this.getScriptsContents(this.pageToDisplay)
    );
    this.setStylesOnHtmlContent(
      this.getStylesContents(this.pageToDisplay)
    );
  }

  getStylesContents(html) {
    const matchedScriptArray = html.match(
      /<style[^>]*>([\w|\W]*)<\/style>/im
    );
    return matchedScriptArray && matchedScriptArray.length > 0
      ? matchedScriptArray[0].replace(/(<([^>]+)>)/gi, ':separator:').split(':separator:').filter(content => content.length > 0)
      : [];
  }

  getScriptsContents(html) {
    const matchedScriptArray = html.match(
      /<script[^>]*>([\w|\W]*)<\/script>/im
    );
    if (matchedScriptArray.length > 1) {
      console.log('html test', matchedScriptArray);
      return matchedScriptArray;
    } else {
      return matchedScriptArray;
    }
  }

  setStylesOnHtmlContent(stylesContentsArray) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = stylesContentsArray.join('');
    this.elementRef.nativeElement.appendChild(style);
    this.hasScriptSet = true;
  }

  setScriptsOnHtmlContent(scriptsContentsArray) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    // script.innerHTML = scriptsContentsArray[0];
    this.elementRef.nativeElement.appendChild(scriptsContentsArray[0]);
    this.hasScriptSet = true;
  }

  getScriptUrl(scriptsContents) {
    let url = '';
    if (scriptsContents && scriptsContents.split('<script').length > 0) {
      scriptsContents.split('<script').forEach((scriptsContent: any) => {
        if (scriptsContent !== '') {
          url = scriptsContent.split('src=')[1].split('>')[0];
        }
      });
    }
    return url;
  }
}
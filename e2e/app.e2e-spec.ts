import { DatamapperUiPage } from './app.po';

describe('datamapper-ui App', function() {
  let page: DatamapperUiPage;

  beforeEach(() => {
    page = new DatamapperUiPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('dev works!');
  });
});

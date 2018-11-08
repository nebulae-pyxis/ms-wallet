import { TestBed, inject } from '@angular/core/testing';

import { TransactionHistoryDetailService } from './transaction-history-detail.service';

describe('TransactionHistoryDetailService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransactionHistoryDetailService]
    });
  });

  it('should be created', inject([TransactionHistoryDetailService], (service: TransactionHistoryDetailService) => {
    expect(service).toBeTruthy();
  }));
});

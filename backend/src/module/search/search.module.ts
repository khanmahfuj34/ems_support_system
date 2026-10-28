import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { SearchExecutor } from './common/search-executor.service.js';
import { GlobalSearchService } from './global-search/global-search.service.js';
import { TicketSearchService } from './ticket-search/ticket-search.service.js';
import { UserSearchService } from './user-search/user-search.service.js';

/** Focused search services are exported for the feature controllers. */
@Module({
  imports: [PrismaModule],
  providers: [
    SearchExecutor,
    TicketSearchService,
    UserSearchService,
    GlobalSearchService,
  ],
  exports: [
    SearchExecutor,
    TicketSearchService,
    UserSearchService,
    GlobalSearchService,
  ],
})
export class SearchModule {}

/*
  Based on Team QA21T02 load testing code
*/

import { sleep, group } from "k6";
import http from "k6/http";
import { check } from "k6";
import { parseHTML } from "k6/html";
import { Rate, Counter } from "k6/metrics";

const address = __ENV.HOSTNAME || "http://localhost:7000";
const stages =
  __ENV.TYPE === "Multiple"
    ? [{ target: 50, duration: "2m" }]
    : [{ target: 1, duration: "30s" }];

let ErrorCount = new Counter("errors");
let ErrorRate = new Rate("error_rate");

const defaultPassword = "Testing9874!";
const pointName = "somePointName"


const headers = {
  "sec-ch-ua":
    '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "upgrade-insecure-requests": "1",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "navigate",
  "sec-fetch-user": "?1",
  "sec-fetch-dest": "document",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "ru-UA,ru-RU;q=0.9,ru;q=0.8,en-US;q=0.7,en;q=0.6",
};

const checkProfilePage = (response) => {
  let res = response.status === 200;
  res = res && response.body.includes("User Preset");
  res = res && response.body.includes("API's keys");
  res = res && response.body.includes("Database user");
  return res;
};

const checkDashboardPage = (response) => {
  let res = response.status === 200;
  res = res && response.body.includes("Total Space");
  res = res && response.body.includes("Bases");
  res = res && response.body.includes("Databases");
  return res;
};

const checkDatabasePage = (response, dbName) => {
  let res = response.status === 200;
  res = res && response.body.includes(dbName);
  res =
    res &&
    response.body.includes(
      "Investigate your database. Look to your data from browser."
    );
  res =
    res &&
    response.body.includes("Seed yor database with your or shared scripts");
  return res;
};

const checkPointPage = (response, dbName) => {
  let res = response.status === 200;
  res = res && response.body.includes(dbName);
  res = res && response.body.includes("Backup");
  res = res && response.body.includes("New backup");
  res = res && response.body.includes("Create new backup");
  return res;
};

export const options = {
  stages,
};

export default function main() {
  const login = Date.now() + "@testv.com";
  const password = defaultPassword;
  let response;
  let success;

  group(`registration - ${address}/registration`, function () {
    response = http.get(`${address}/registration`, { headers });

    success = check(response, {
      "Load registration page": (r) => r.status === 200,
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }

    response = http.post(
      `${address}/registration`,
      {
        _csrf: "_csrf",
        conformation: `${password}`,
        login: `${login}`,
        password: `${password}`,
      },
      { headers }
    );
    success = check(response, {
      "Fill in the registration fields": (r) =>
        r.status === 200 && r.body.includes(login),
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(`go-to-profile - ${address}/profile`, function () {
    response = http.get(`${address}/profile`, { headers });

    success = check(response, {
      "Load profile page": (r) => {
        let res = checkProfilePage(r);
        res = res && !response.body.includes("It's your");
        return res;
      },
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(`upgrade-user - ${address}/profile/upgrade`, function () {
    response = http.post(
      `${address}/profile/upgrade`,
      {
        role: "BASIC_USER",
      },
      { headers }
    );
    success = check(response, {
      "Upgrade user": (r) => {
        let res = checkProfilePage(r);
        res = res && response.body.includes("It's your");
        return res;
      },
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(`go-to-dashboard - ${address}`, function () {
    response = http.get(`${address}`, { headers });
    success = check(response, {
      "Load dashboard page": (r) => checkDashboardPage(r),
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(`create-database - ${address}/database`, function () {
    response = http.post(
      `${address}/database`,
      {
        _csrf: "_csrf",
      },
      { headers }
    );

    success = check(response, {
      "Create database": (r) =>
        r.status === 200 && r.body.includes("Database created"),
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(`second-go-to-profile - ${address}/profile`, function () {
    response = http.get(`${address}/profile`, { headers });

    success = check(response, {
      "Load profile page 2": (r) => checkProfilePage(r),
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(`go-to-home - ${address}`, function () {
    response = http.get(`${address}`, { headers });

    success = check(response, {
      "Load home page": (r) => checkDashboardPage(r),
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  const res = http.get(`${address}/home`);
  const doc = parseHTML(res.body);
  const databaseName = doc.find("h6").text().trim();

  group(`go-to-database - ${address}/database/${databaseName}`, function () {
    response = http.get(`${address}/database/${databaseName}`, {
      headers,
    });

    success = check(response, {
      "Load database page": (r) => checkDatabasePage(r, databaseName),
    });
    if (!success) {
      ErrorCount.add(1);
      ErrorRate.add(true);
    } else {
      ErrorRate.add(false);
    }
  });

  group(
    `go-to-backups - ${address}/database/${databaseName}/point`,
    function () {
      response = http.get(`${address}/database/${databaseName}/point`, {
        headers,
      });

      success = check(response, {
        "Load backups page": (r) => checkPointPage(r, databaseName),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );

  group(
    `create-new-point - ${address}/database/${databaseName}/point/`,
    function () {
      response = http.post(
        `${address}/database/${databaseName}/point/`,
        {
          _csrf: "_csrf",
          point: pointName,
        },
        { headers }
      );

      success = check(response, {
        "Create new point": (r) =>
          r.status === 200 && r.body.includes("Backup created successfully"),
        "Verify point name is test": (r) => r.body.includes(pointName),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );

  group(
    `create-table-sql - ${address}0/database/${databaseName}/sql`,
    function () {
      response = http.get(`${address}/database/${databaseName}/sql`, {
        headers,
      });

      success = check(response, {
        "Load sql page": (r) =>
          r.status === 200 &&
          r.body.includes("to run current query.") &&
          r.body.includes("to run all query."),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }

      response = http.post(
        `${address}/database/${databaseName}/sql`,
        {
          query: "CREATE TABLE test (col_name varchar(20), col_value int);",
        },
        { headers }
      );

      success = check(response, {
        "Create table test": (r) =>
          r.status === 200 && r.body.includes("DDL/DML performed"),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }

      response = http.post(
        `${address}/database/${databaseName}/sql`,
        {
          query: "INSERT INTO test VALUES ('test1', 1)",
        },
        { headers }
      );

      success = check(response, {
        "Insert into test 1": (r) =>
          r.status === 200 && r.body.includes("DDL/DML performed Changed: 1"),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }

      response = http.post(
        `${address}/database/${databaseName}/sql`,
        {
          query: "INSERT INTO test VALUES ('test2', 2)",
        },
        { headers }
      );

      success = check(response, {
        "Insert into test 2": (r) =>
          r.status === 200 && r.body.includes("DDL/DML performed Changed: 1"),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );

  group(
    `second-go-to-database - ${address}/database/${databaseName}/`,
    function () {
      response = http.get(`${address}/database/${databaseName}/`, {
        headers,
      });

      success = check(response, {
        "Load database page 2": (r) => checkDatabasePage(r, databaseName),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );

  group(
    `go-to-tables - ${address}/database/${databaseName}/table`,
    function () {
      response = http.get(`${address}/database/${databaseName}/table`, {
        headers,
      });

      success = check(response, {
        "Load tables page": (r) => r.status === 200 && r.body.includes("Table name"),
        "Verify table name is test": (r) => r.body.includes("test"),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );

  group(
    `go-to-table - ${address}/database/${databaseName}/table/test`,
    function () {
      response = http.get(`${address}/database/${databaseName}/table/test`, {
        headers,
      });
      success = check(response, {
        "Load table test page": (r) => r.status === 200,
        "Verify columns name": (r) => r.body.includes("col_name") && r.body.includes("col_value"),
        "Verify columns values": (r) => r.body.includes("test1") && r.body.includes("test2"),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );

  group(
    `third-go-to-database - ${address}/database/${databaseName}/`,
    function () {
      response = http.get(`${address}/database/${databaseName}/`, {
        headers,
      });

      success = check(response, {
        "Load database page 3": (r) =>checkDatabasePage(r, databaseName),
      });
      if (!success) {
        ErrorCount.add(1);
        ErrorRate.add(true);
      } else {
        ErrorRate.add(false);
      }
    }
  );
  sleep(1);
}

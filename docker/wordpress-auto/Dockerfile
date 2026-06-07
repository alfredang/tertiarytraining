# Auto-configuring WordPress image for on-demand training labs.
#
# Based on the official WordPress image, it bundles WP-CLI and a wrapper
# entrypoint that waits for the database and runs `wp core install` once — so
# the site comes up FULLY CONFIGURED (no install wizard) with a known admin
# login. Build args / env let you override the admin credentials and site URL.
#
# Build:   docker build -t tt-wordpress-auto:latest docker/wordpress-auto
FROM wordpress:latest

# WP-CLI, copied from the official wordpress:cli image (no extra download).
COPY --from=wordpress:cli /usr/local/bin/wp /usr/local/bin/wp

COPY auto-install.sh /usr/local/bin/tt-auto-install.sh
RUN chmod +x /usr/local/bin/wp /usr/local/bin/tt-auto-install.sh

# Our wrapper runs first; it backgrounds the auto-install, then hands off to the
# stock WordPress entrypoint (which writes wp-config.php and starts Apache).
ENTRYPOINT ["/usr/local/bin/tt-auto-install.sh"]
CMD ["apache2-foreground"]
